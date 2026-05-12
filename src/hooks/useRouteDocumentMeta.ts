import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { applyDocumentMeta } from "@/src/lib/seo/applyDocumentMeta";
import { resolveSeoOrigin } from "@/src/lib/seo/publicOrigin";
import { isAdminAppRoute } from "@/src/lib/isAdminAppRoute";
import { ADMIN_STAFF_ROBOTS, DEFAULT_DESCRIPTION, getRouteSeo } from "@/src/lib/seo/routeSeo";

const HOME_JSON_LD_ID = "jatriswap-home-jsonld";

function removeHomeJsonLd() {
  document.getElementById(HOME_JSON_LD_ID)?.remove();
}

function injectHomeJsonLd(siteUrl: string) {
  removeHomeJsonLd();
  const script = document.createElement("script");
  script.type = "application/ld+json";
  script.id = HOME_JSON_LD_ID;
  script.textContent = JSON.stringify({
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${siteUrl}/#website`,
        name: "JatriSwap",
        url: siteUrl,
        description: DEFAULT_DESCRIPTION,
      },
      {
        "@type": "Organization",
        "@id": `${siteUrl}/#organization`,
        name: "JatriSwap Inc.",
        url: siteUrl,
      },
    ],
  });
  document.head.appendChild(script);
}

/**
 * Keeps title, meta description, canonical, Open Graph, and Twitter tags aligned with the route.
 * Staff `/admin` routes get `ADMIN_STAFF_ROBOTS`. Home route gets WebSite + Organization JSON-LD.
 */
export function useRouteDocumentMeta() {
  const location = useLocation();

  useEffect(() => {
    const { pathname, search, hash } = location;
    const origin = resolveSeoOrigin();
    const pathWithQuery = `${pathname}${search}${hash}`;
    const canonicalUrl = origin ? `${origin}${pathWithQuery}` : null;
    const admin = isAdminAppRoute(pathname);
    const seo = getRouteSeo(pathname);

    applyDocumentMeta({
      title: seo.title,
      description: seo.description,
      canonicalUrl,
      robots: admin ? ADMIN_STAFF_ROBOTS : undefined,
    });

    if (pathname === "/") {
      injectHomeJsonLd(origin || window.location.origin);
    } else {
      removeHomeJsonLd();
    }
  }, [location.pathname, location.search, location.hash]);
}
