import type { MetadataRoute } from "next";

// Resident data must never be indexed.
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", disallow: "/" } };
}
