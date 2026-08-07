-- Aurum Rails — remittance schema
-- See specs/001-uae-global-remittance/data-model.md
--
-- Design rules enforced here, not merely intended:
--   * All money is bigint minor units. No float/real anywhere near money.
--   * chain_id is CHECKed to Arc Testnet (Constitution Principle I).
--   * status_events is append-only; a FAILED event must carry a reason.
--   * idempotency_key is UNIQUE, so FR-014 is a constraint, not a convention.

create type transfer_state as enum (
  'INITIATED','QUOTE_LOCKED','FUNDING','SUBMITTED','SETTLING',
  'SETTLED','DELIVERING','DELIVERED','FAILED','PENDING_RETRY','NEEDS_REVIEW'
);

-- ─── recipients ──────────────────────────────────────────────────────────────
create table if not exists recipients (
  id                text primary key,
  name              text not null,
  corridor_code     text not null,
  contact_handle    text,
  claim_token       text not null unique,
  circle_wallet_id  text,
  address           text,
  chain_id          integer not null default 5042002,
  created_at        timestamptz not null default now(),
  constraint recipients_arc_only check (chain_id = 5042002)
);

-- ─── quotes ──────────────────────────────────────────────────────────────────
create table if not exists quotes (
  id                    uuid primary key,
  recipient_id          text not null references recipients(id) on delete cascade,
  send_aed              bigint not null check (send_aed > 0),
  send_usdc6            bigint not null check (send_usdc6 > 0),
  network_fee_usdc6     bigint not null check (network_fee_usdc6 >= 0),
  service_fee_usdc6     bigint not null check (service_fee_usdc6 >= 0),
  fx_spread_bps         integer not null default 0,
  fx_rate_scaled        bigint not null,
  fx_rate_scale         bigint not null,
  fx_source             text not null,
  fx_retrieved_at       timestamptz not null,
  fx_is_stale           boolean not null default false,
  landed_amount_minor   bigint not null,
  landed_currency       text not null,
  eta_seconds           integer not null,
  created_at            timestamptz not null default now(),
  expires_at            timestamptz not null
);

-- ─── transfers ───────────────────────────────────────────────────────────────
create table if not exists transfers (
  id                    uuid primary key,
  quote_id              uuid not null references quotes(id),
  recipient_id          text not null references recipients(id),
  amount_usdc6          bigint not null check (amount_usdc6 > 0),
  idempotency_key       text not null unique,
  circle_transaction_id text unique,
  tx_hash               text,
  explorer_url          text,
  created_at            timestamptz not null default now(),
  delivered_at          timestamptz
);

-- ─── status_events (append-only) ─────────────────────────────────────────────
create table if not exists status_events (
  id             uuid primary key,
  transfer_id    uuid not null references transfers(id) on delete cascade,
  from_state     transfer_state,
  to_state       transfer_state not null,
  occurred_at    timestamptz not null default now(),
  reason         text,
  correlation_id text not null,
  -- FR-019: a failure without an explanation is not representable.
  constraint failure_needs_reason check (to_state <> 'FAILED' or reason is not null)
);

create index if not exists status_events_transfer_idx
  on status_events (transfer_id, occurred_at);
create index if not exists transfers_created_idx
  on transfers (created_at desc);

-- Latest state per transfer, without a mutable column that can drift.
create or replace view transfer_current_status as
select distinct on (transfer_id)
  transfer_id, to_state as state, occurred_at, reason
from status_events
order by transfer_id, occurred_at desc, id desc;

-- ─── RLS ─────────────────────────────────────────────────────────────────────
-- This build has no end-user auth yet: every write goes through the server using
-- the service role, which bypasses RLS. RLS is still enabled so that nothing is
-- readable with the anon key by default — deny-by-default rather than open.
alter table recipients    enable row level security;
alter table quotes        enable row level security;
alter table transfers     enable row level security;
alter table status_events enable row level security;
