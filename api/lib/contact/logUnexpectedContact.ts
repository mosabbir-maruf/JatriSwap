export function logUnexpectedContactError(context: string, err: unknown): void {
  const code =
    err && typeof err === "object" && "code" in err
      ? String((err as { code: unknown }).code)
      : undefined;
  const msg = err instanceof Error ? err.message.slice(0, 240) : typeof err;
  console.error(`contact.${context}`, { code: code ?? "none", msg });
}
