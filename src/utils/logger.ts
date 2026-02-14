// ── Simple structured logger ─────────────────────────────
//
// Lightweight logger that prefixes messages with a timestamp,
// level, and optional context label. Easy to swap for a
// full library (pino, winston) later.

type LogLevel = "info" | "warn" | "error" | "debug";

function timestamp(): string {
  return new Date().toISOString();
}

function format(level: LogLevel, label: string, message: string): string {
  return `[${timestamp()}] [${level.toUpperCase()}] [${label}] ${message}`;
}

/** Create a child logger scoped to a specific module / label. */
export function createLogger(label: string) {
  return {
    info(message: string, meta?: unknown) {
      console.log(format("info", label, message), meta ?? "");
    },

    warn(message: string, meta?: unknown) {
      console.warn(format("warn", label, message), meta ?? "");
    },

    error(message: string, error?: unknown) {
      console.error(format("error", label, message));
      if (error instanceof Error) {
        console.error(`  ↳ ${error.name}: ${error.message}`);
        if (error.stack) console.error(error.stack);
      } else if (error !== undefined) {
        console.error("  ↳", error);
      }
    },

    debug(message: string, meta?: unknown) {
      if (process.env.NODE_ENV !== "production") {
        console.debug(format("debug", label, message), meta ?? "");
      }
    },
  };
}

/** Pre-built loggers for common modules */
export const logger = {
  server: createLogger("Server"),
  graphql: createLogger("GraphQL"),
  auth: createLogger("Auth"),
  team: createLogger("Team"),
  task: createLogger("Task"),
};
