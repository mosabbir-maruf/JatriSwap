import fs from "node:fs";
import path from "node:path";
import { normalizePublicSiteUrl } from "./publicOrigin";

/** When `VITE_PUBLIC_SITE_URL` is unset on Vercel Production builds. */
const DEFAULT_PRODUCTION_ORIGIN = "https://jatriswap.vercel.app";

function originFromHost(host: string | undefined): string {
  const trimmed = host?.trim();
  if (!trimmed) return "";
  return normalizePublicSiteUrl(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
}

export function resolveSitemapBuildOrigin(env: Record<string, string>): string {
  const explicit = normalizePublicSiteUrl(env.VITE_PUBLIC_SITE_URL);
  if (explicit) return explicit;
  if (env.VERCEL_ENV === "production" || process.env.VERCEL_ENV === "production") {
    return DEFAULT_PRODUCTION_ORIGIN;
  }
  return originFromHost(env.VERCEL_PROJECT_PRODUCTION_URL) || originFromHost(env.VERCEL_URL);
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function emitSitemapAndRobots(opts: {
  distDir: string;
  projectRoot: string;
  base: string;
  publicPaths: readonly string[];
}): void {
  const { distDir, projectRoot, base, publicPaths } = opts;
  const urlEntries = publicPaths.map((p) => {
    const loc = p === "/" ? `${base}/` : `${base}${p}`;
    const priority = p === "/" ? "1.0" : "0.8";
    return `  <url>\n    <loc>${escapeXml(loc)}</loc>\n    <changefreq>weekly</changefreq>\n    <priority>${priority}</priority>\n  </url>`;
  });
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urlEntries.join("\n")}\n</urlset>\n`;
  fs.writeFileSync(path.join(distDir, "sitemap.xml"), xml, "utf-8");

  const robotsSrc = path.join(projectRoot, "public", "robots.txt");
  if (!fs.existsSync(robotsSrc)) return;
  const baseRobots = fs.readFileSync(robotsSrc, "utf-8").replace(/\s+$/, "");
  fs.writeFileSync(
    path.join(distDir, "robots.txt"),
    `${baseRobots}\n\nSitemap: ${base}/sitemap.xml\n`,
    "utf-8",
  );
}
