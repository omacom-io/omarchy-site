export type StructuredDataValue =
  | string
  | number
  | boolean
  | null
  | StructuredDataValue[]
  | { [key: string]: StructuredDataValue };

export type StructuredData = Record<string, StructuredDataValue>;

export type SeoImage = {
  url: string;
  width?: string;
  height?: string;
  alt?: string;
};

export type SeoMeta = {
  title: string;
  description?: string;
  canonicalUrl?: string;
  ogSiteName?: string;
  socialTitle?: string;
  socialDescription?: string;
  image?: SeoImage;
  ogUrl?: string;
  ogType?: "website" | "article";
  twitter?: false | { card: "summary" | "summary_large_image" };
  author?: string;
  publishedTime?: string;
  structuredData?: readonly StructuredData[];
  robots?: string;
};

type PageSeoInput = {
  title: string;
  description: string;
  socialTitle?: string;
  socialDescription?: string;
  image?: string;
  twitter?: SeoMeta["twitter"];
};

type PageContext = { url: URL; site?: URL };

function absoluteUrl(path: string, site: URL): string {
  return new URL(path, site).href.replace(/\/$/, "");
}

export function currentPageUrl({ url, site }: PageContext): string {
  const pathname = url.pathname === "/" ? "/" : url.pathname.replace(/\/$/, "");
  return absoluteUrl(pathname, site ?? url);
}

/** The standard Omarchy social card used by static marketing pages. */
export function pageSeo(
  context: PageContext,
  { image, socialTitle, socialDescription, twitter, ...seo }: PageSeoInput,
): SeoMeta {
  const currentUrl = currentPageUrl(context);

  return {
    ...seo,
    canonicalUrl: currentUrl,
    ogSiteName: "Omarchy",
    socialTitle: socialTitle ?? seo.title,
    socialDescription: socialDescription ?? seo.description,
    image: image
      ? {
          url: absoluteUrl(image, context.site ?? context.url),
          width: "2400",
          height: "1260",
          alt: "Omarchy logo",
        }
      : undefined,
    ogUrl: currentUrl,
    ogType: "website",
    twitter: twitter ?? { card: "summary_large_image" },
  };
}

export function blogPostingStructuredData({
  headline,
  description,
  datePublished,
  author,
  authorUrl,
  canonicalUrl,
}: {
  headline: string;
  description: string;
  datePublished: string;
  author: string;
  authorUrl?: string;
  canonicalUrl: string;
}): StructuredData {
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline,
    description,
    datePublished,
    author: {
      "@type": authorUrl ? "Person" : "Organization",
      name: author,
      ...(authorUrl ? { url: authorUrl } : {}),
    },
    publisher: {
      "@type": "Organization",
      name: "Omarchy",
      logo: {
        "@type": "ImageObject",
        url: "https://omarchy.org/assets/images/favicon.png",
      },
    },
    image: "https://omarchy.org/assets/images/favicon.png",
    mainEntityOfPage: canonicalUrl,
  };
}

/** Keep `<\/script>` from being introduced by data embedded in JSON-LD. */
export function serializeStructuredData(data: StructuredData): string {
  return JSON.stringify(data).replaceAll("</", "<\\/");
}
