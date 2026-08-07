-- Cross-chain delivery (User Story 3).
--
-- Without these columns, hydration silently dropped a recipient's delivery
-- network: the row round-tripped through Postgres and came back as Arc, so a
-- cross-chain payment quietly became a local one. Persisted state must carry
-- everything the orchestrator branches on.

alter table recipients
  add column if not exists destination_code    text not null default 'ARC',
  add column if not exists destination_address text;

alter table transfers
  add column if not exists destination_tx_hash      text,
  add column if not exists destination_explorer_url text;
