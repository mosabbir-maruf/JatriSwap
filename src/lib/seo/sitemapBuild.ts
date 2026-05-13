import fs from "node:fs";
import path from "node:path";
import { normalizePublicSiteUrl } from "./publicOrigin";

/** When `VITE_PUBLIC_SITE_URL` is unset on Vercel Production builds. */
const DEFAULT_PRODUCTION_ORIGIN = "https://jatriswap.vercel.app";

export function resolveSitemapBuildOrigin(env: Record<string, string>): string {
  const explicit = normalizePublicSiteUrl(env.VITE_PUBLIC_SITE_URL);
  if (explicit) return explicit;
  if (process.env.VERCEL_ENV === "production") return DEFAULT_PRODUCTION_ORIGIN;
  const vercelUrl = process.env.VERCEL_URL?.trim();
  if (!vercelUrl) return "";
  const host = vercelUrl.replace(/^https?:\/\//, "").replace(/\/+$/, "");
  return `https://${host}`;
}

export function emitSitemapAndRobots(opts: {
  distDir: string;
  projectRoot: string;
  base: string;
  publicPaths: readonly string[];
}): void {
  const { distDir, projectRoot, base, publicPaths } = opts;
  const urlEntries = publicPaths.map((p) => {
    const loc = p === "/" ? base : `${base}${p}`;
    const priority = p === "/" ? "1.0" : "0.8";
    return `  <url>\n    <loc>${loc}</loc>\n    <changefreq>weekly</changefreq>\n    <priority>${priority}</priority>\n  </url>`;
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
