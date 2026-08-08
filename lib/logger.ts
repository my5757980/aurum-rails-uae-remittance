/**
 * Structured logging (FR-030).
 *
 * Every Circle API call and chain submission emits correlation id, operation,
 * outcome and duration — and never a secret.
 *
 * Redaction is not best-effort. Values are matched against the known shapes of
 * every credential this app handles (Circle API keys, entity secrets, Supabase
 * service keys, JWTs) and against a key-name denylist, because the cheapest
 * place to leak a key is a log line nobody reads until it is in a screenshot.
 */

type Level = "debug" | "info" | "warn" | "error";
type Fields = Record<string, unknown>;

/** Field names whose values are never printed, whatever they contain. */
const SECRET_KEYS = [
  "apikey",
  "api_key",
  "entitysecret",
  "entity_secret",
  "secret",
  "password",
  "token",
  "authorization",
  "cookie",
  "privatekey",
  "private_key",
  "serviceRole",
  "service_role",
];

/** Value shapes that are credentials regardless of the field they arrived in. */
const SECRET_PATTERNS: RegExp[] = [
  /\b(TEST|LIVE)_API_KEY:[\w-]+:[\w-]+/gi, // Circle API key
  /\bsb_(secret|publishable)_[A-Za-z0-9_-]{10,}/g, // Supabase keys
  /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g, // JWT
  /\b[0-9a-f]{64}\b/gi, // 32-byte hex — entity secret
];

const REDACTED = "[redacted]";

function scrubString(value: string): string {
  let out = value;
  for (const pattern of SECRET_PATTERNS) out = out.replace(pattern, REDACTED);
  return out;
}

function scrub(value: unknown, depth = 0): unknown {
  if (depth > 4) return "[deep]";
  if (typeof value === "string") return scrubString(value);
  if (typeof value === "bigint") return value.toString();
  if (value === null || typeof value !== "object") return value;

  if (Array.isArray(value)) return value.map((v) => scrub(v, depth + 1));

  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    out[k] = SECRET_KEYS.includes(k.toLowerCase()) ? REDACTED : scrub(v, depth + 1);
  }
  return out;
}

function emit(level: Level, event: string, fields: Fields = {}): void {
  const line = {
    ts: new Date().toISOString(),
    level,
    event,
    ...(scrub(fields) as Fields),
  };
  const text = JSON.stringify(line);
  if (level === "error") console.error(text);
  else if (level === "warn") console.warn(text);
  else console.log(text);
}

export const logger = {
  debug: (event: string, fields?: Fields) => emit("debug", event, fields),
  info: (event: string, fields?: Fields) => emit("info", event, fields),
  warn: (event: string, fields?: Fields) => emit("warn", event, fields),
  error: (event: string, fields?: Fields) => emit("error", event, fields),
};

/**
 * Time an external call and log its outcome and duration.
 * Errors are re-thrown — this observes, it never swallows.
 */
export async function timed<T>(
  event: string,
  fields: Fields,
  fn: () => Promise<T>,
): Promise<T> {
  const started = Date.now();
  try {
    const result = await fn();
    emit("info", event, { ...fields, outcome: "ok", durationMs: Date.now() - started });
    return result;
  } catch (error) {
    emit("error", event, {
      ...fields,
      outcome: "error",
      durationMs: Date.now() - started,
      message: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
