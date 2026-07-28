import type { MetadataRoute } from "next";

// Only the marketing pages should be indexed. Everything below is either
// behind AuthGuard or user-specific, so crawling it wastes budget and can
// surface app shells in search results.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin",
        "/dashboard",
        "/reports",
        "/profile",
        "/chat",
        "/verify",
        "/checkout",
        "/find-partners",
        "/methodology",
      ],
    },
  };
}
