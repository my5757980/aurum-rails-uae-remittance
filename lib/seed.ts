/**
 * Demo seed — makes the hero flow runnable in one click (FR-037).
 *
 * Recipients get a real Circle wallet on Arc so transfers are genuinely
 * on-chain. Wallet creation is lazy: the first request pays the cost, and it is
 * memoised so a hot-reload does not create a wallet on every render.
 */

import "server-only";
import { db, type Recipient } from "./domain";
import { createWallet, listWallets } from "./wallet-service";
import { hydrate, saveRecipient } from "./persist";

const SEED: Array<Omit<Recipient, "walletId" | "address" | "createdAt">> = [
  {
    id: "r-priya",
    name: "Priya Nair",
    corridorCode: "IN",
    contactHandle: "+91 98•••• ••32",
    claimToken: "claim-priya-8f3a2c9d4e1b",
  },
  {
    id: "r-imran",
    name: "Imran Sheikh",
    corridorCode: "PK",
    contactHandle: "+92 30•••• ••17",
    claimToken: "claim-imran-2b7e5a1f9c34",
  },
  {
    id: "r-maria",
    name: "Maria Santos",
    corridorCode: "PH",
    contactHandle: "+63 917 ••• ••55",
    claimToken: "claim-maria-6d4c8e2a7b19",
  },
];

let seeding: Promise<void> | null = null;

export async function ensureSeeded(): Promise<void> {
  // Restore anything a previous run persisted before deciding to seed.
  await hydrate();

  if (db.recipients.size > 0) return;
  if (seeding) return seeding;

  seeding = (async () => {
    // Reuse wallets that already exist in the set before minting new ones —
    // the spike already created some, and wallet creation is not free.
    const existing = await listWallets();
    // wallets[0] is the sender/treasury; recipients take the rest.
    const pool = existing.slice(1);

    for (let i = 0; i < SEED.length; i++) {
      const base = SEED[i]!;
      const reused = pool[i];
      const wallet = reused ?? (await createWallet());

      const recipient: Recipient = {
        ...base,
        walletId: wallet.id,
        address: wallet.address,
        createdAt: new Date().toISOString(),
      };
      db.recipients.set(recipient.id, recipient);
      db.claimTokens.set(recipient.claimToken, recipient.id);
      saveRecipient(recipient);
    }
  })();

  try {
    await seeding;
  } finally {
    seeding = null;
  }
}

export const listRecipients = (): Recipient[] => [...db.recipients.values()];
