import { logServerError } from "../serverLogging";

export function logUnexpectedContactError(context: string, err: unknown): void {
  const isDev = process.env.NODE_ENV !== "production";
  const code =
    err && typeof err === "object" && "code" in err
      ? String((err as { code: unknown }).code)
      : undefined;
  const msg = err instanceof Error ? err.message.slice(0, 240) : typeof err;
  logServerError(`contact.${context}`, err, { code: code ?? "none", ...(isDev ? { msg } : {}) });
}
