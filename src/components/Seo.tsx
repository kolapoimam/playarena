import { Helmet } from "react-helmet";

const SITE = "https://app.sportcliq.com";
const DEFAULT_IMAGE = `${SITE}/og-image.png`;

type SeoProps = {
  title?: string;
  description?: string;
  image?: string | null;
  url?: string;
  children?: React.ReactNode;
  /** Optional schema.org object for this page. */
  jsonLd?: Record<string, unknown> | null;
  noindex?: boolean;
};

const clean = (t?: string) => (t || "").replace(/\s*\|\s*Sport Cliq/g, " | SportCliq").replace(/Sport Cliq/g, "SportCliq");

export function Seo({ title, description, image, url, children, jsonLd, noindex }: SeoProps) {
  const path = typeof window !== "undefined" ? window.location.pathname : "/";
  const canonical = `${SITE}${path === "/" ? "/" : path.replace(/\/$/, "")}`;
  const img = image || DEFAULT_IMAGE;
  const t = clean(title);
  // Keep descriptions short enough for search snippets.
  const d = description ? (description.length > 300 ? description.slice(0, 297).replace(/\s+\S*$/, "") + "..." : description) : undefined;
  return (
    <Helmet>
      {t && <title>{t}</title>}
      {d && <meta name="description" content={d} />}
      <link rel="canonical" href={canonical} />
      {noindex && <meta name="robots" content="noindex, follow" />}
      <meta property="og:url" content={url && url.startsWith(SITE) ? url : canonical} />
      {t && <meta property="og:title" content={t} />}
      {d && <meta property="og:description" content={d} />}
      <meta property="og:image" content={img} />
      {t && <meta name="twitter:title" content={t} />}
      {d && <meta name="twitter:description" content={d} />}
      <meta name="twitter:image" content={img} />
      {jsonLd && <script type="application/ld+json">{JSON.stringify({ "@context": "https://schema.org", ...jsonLd })}</script>}
      {children}
    </Helmet>
  );
}
