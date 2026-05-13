const IS_DEV = import.meta.env.DEV;

type LogMeta = Record<string, unknown> | undefined;

function normalizeError(error: unknown): Record<string, unknown> | undefined {
  if (!error) return undefined;
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }
  if (typeof error === "object") return { value: error };
  return { value: String(error) };
}

function write(level: "debug" | "info" | "warn" | "error", event: string, error?: unknown, meta?: LogMeta): void {
  if (!IS_DEV) return;
  const payload = {
    event,
    ...(meta ?? {}),
    ...(error !== undefined ? { error: normalizeError(error) } : {}),
  };
  const tag = `[client:${event}]`;
  if (level === "debug") console.debug(tag, payload);
  else if (level === "info") console.info(tag, payload);
  else if (level === "warn") console.warn(tag, payload);
  else console.error(tag, payload);
}

export const clientLogger = {
  debug: (event: string, meta?: LogMeta) => write("debug", event, undefined, meta),
  info: (event: string, meta?: LogMeta) => write("info", event, undefined, meta),
  warn: (event: string, error?: unknown, meta?: LogMeta) => write("warn", event, error, meta),
  error: (event: string, error?: unknown, meta?: LogMeta) => write("error", event, error, meta),
};

export function userVisibleErrorMessage(error: unknown, fallback: string): string {
  if (IS_DEV && error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }
  return fallback;
}

