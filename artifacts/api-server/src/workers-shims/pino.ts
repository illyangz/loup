// Workers-only replacement for `pino`, aliased in via wrangler.toml's
// [alias] block — the Node build (build.mjs) is untouched and still uses
// real pino. Real pino's base transport (sonic-boom) depends on Node
// internals the Workers runtime doesn't have; deploying with it throws
// `Cannot read properties of undefined (reading 'stringifySym')` inside
// pino-http's logger.js at Cloudflare's validation step — bundling
// succeeds, but the script fails when Cloudflare actually evaluates it.
// This shim implements only the subset of pino's API this codebase uses
// (level-gated info/warn/error/debug, one-line JSON to console) — no
// transports, no redact (nothing here logs raw request bodies where the
// redacted fields would appear), no worker threads.

type LogFields = Record<string, unknown>;
type LogFn = (fieldsOrMsg: LogFields | string, msg?: string) => void;

export interface ShimLogger {
  info: LogFn;
  warn: LogFn;
  error: LogFn;
  debug: LogFn;
}

const LEVELS = { debug: 20, info: 30, warn: 40, error: 50 } as const;

function makeLogFn(minLevel: number, level: keyof typeof LEVELS): LogFn {
  const levelValue = LEVELS[level];
  const consoleFn = level === "error" ? console.error : level === "warn" ? console.warn : console.log;
  return (fieldsOrMsg, msg) => {
    if (levelValue < minLevel) return;
    const entry =
      typeof fieldsOrMsg === "string"
        ? { level, msg: fieldsOrMsg }
        : { level, msg, ...fieldsOrMsg };
    consoleFn(JSON.stringify(entry));
  };
}

export default function pino(opts?: { level?: string }): ShimLogger {
  const minLevel = LEVELS[(opts?.level as keyof typeof LEVELS) ?? "info"] ?? LEVELS.info;
  return {
    debug: makeLogFn(minLevel, "debug"),
    info: makeLogFn(minLevel, "info"),
    warn: makeLogFn(minLevel, "warn"),
    error: makeLogFn(minLevel, "error"),
  };
}
