/** First letters of up to the first two whitespace-separated tokens (shared across profile UIs). */
export function initialsFromDisplayName(name: string | undefined | null): string {
  const n = typeof name === "string" ? name.trim() : "";
  if (!n) return "?";
  const letters = n
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("");
  return letters.toUpperCase() || "?";
}
