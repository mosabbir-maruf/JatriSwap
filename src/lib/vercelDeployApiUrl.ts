/**
 * Same-origin Vercel serverless routes when unset; otherwise the deployed API origin (see `VITE_CONTACT_API_URL`).
 */
export function vercelDeployApiUrl(apiPath: string): string {
  const path = apiPath.startsWith("/") ? apiPath : `/${apiPath}`;
  const raw = import.meta.env.VITE_CONTACT_API_URL;
  const trimmed = typeof raw === "string" ? raw.trim().replace(/\/$/, "") : "";
  if (trimmed.length > 0) return `${trimmed}${path}`;
  return path;
}
