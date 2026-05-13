const IS_DEV = process.env.NODE_ENV !== "production";

type ServerMeta = Record<string, unknown> | undefined;

function normalizeError(error: unknown): Record<string, unknown> | undefined {
  if (!error) return undefined;
  if (error instanceof Error) {
    return IS_DEV
      ? { name: error.name, message: error.message, stack: error.stack }
      : { name: error.name };
  }
  return IS_DEV ? { value: String(error) } : { type: typeof error };
}

export function logServerError(event: string, error?: unknown, meta?: ServerMeta): void {
  if (!IS_DEV && !error) return;
  if (!IS_DEV) {
    console.error(`[server:${event}]`, {
      ...(meta ?? {}),
      ...(error ? { error: normalizeError(error) } : {}),
    });
    return;
  }
  console.error(`[server:${event}]`, {
    ...(meta ?? {}),
    ...(error ? { error: normalizeError(error) } : {}),
  });
}

export function isServerDev(): boolean {
  return IS_DEV;
}
