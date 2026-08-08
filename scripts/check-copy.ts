/**
 * NFR-017 / SC-007 — no crypto vocabulary on the default path.
 *
 *   npm run check:copy
 *
 * Persona A does not know what gas, a seed phrase, or a nonce is, and has no
 * reason to learn. This scans user-visible copy for terms that would break that
 * promise and exits non-zero if any appear.
 *
 * Deliberately scans STRING LITERALS AND JSX TEXT ONLY. Identifiers, imports and
 * comments are exempt — `lib/chain.ts` must be free to call a chain a chain.
 * Files that exist to show technical detail behind a disclosure are exempt too.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOTS = ["app", "components"];

/** Exempt: these exist to show technical detail, or are not user copy. */
const EXEMPT = [
  "components/TechnicalDetails.tsx",
  "app/api/", // server responses, not rendered copy
];

/** Words a non-crypto-native user should never have to read. */
const BANNED = [
  "seed phrase",
  "private key",
  "gas fee",
  "gas price",
  "nonce",
  "mnemonic",
  "wallet address",
  "blockchain",
  "crypto wallet",
  "web3",
  "metamask",
  "sign the transaction",
];

/**
 * Allowed in context. "Arc" is a product name the user sees on the receipt, and
 * "network cost" is the honest name for what other apps hide as "gas".
 */
const ALLOWED_PHRASES = ["network cost", "on another network", "their network"];

interface Hit {
  file: string;
  line: number;
  term: string;
  text: string;
}

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === "node_modules" || entry.startsWith(".")) continue;
      walk(full, out);
    } else if (/\.(tsx|ts)$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

/** Strip comments so a note explaining the rule cannot trip the rule. */
function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

function scan(file: string): Hit[] {
  const relPath = relative(process.cwd(), file).replace(/\\/g, "/");
  if (EXEMPT.some((e) => relPath.includes(e))) return [];

  const lines = stripComments(readFileSync(file, "utf8")).split("\n");
  const hits: Hit[] = [];

  lines.forEach((line, i) => {
    const lower = line.toLowerCase();
    if (ALLOWED_PHRASES.some((a) => lower.includes(a))) return;

    for (const term of BANNED) {
      if (lower.includes(term)) {
        hits.push({ file: relPath, line: i + 1, term, text: line.trim().slice(0, 100) });
      }
    }
  });

  return hits;
}

const files = ROOTS.flatMap((r) => {
  try {
    return walk(r);
  } catch {
    return [];
  }
});

const hits = files.flatMap(scan);

console.log(`\nScanned ${files.length} files in ${ROOTS.join(", ")} for crypto vocabulary.\n`);

if (hits.length === 0) {
  console.log("✅ PASS — no banned terms on the user-visible path (NFR-017).\n");
  process.exit(0);
}

console.log(`❌ FAIL — ${hits.length} banned term(s):\n`);
for (const h of hits) {
  console.log(`  ${h.file}:${h.line}  "${h.term}"`);
  console.log(`    ${h.text}\n`);
}
console.log("Persona A does not know these words. Rewrite in plain language, or");
console.log("move the detail behind components/TechnicalDetails.tsx.\n");
process.exit(1);
