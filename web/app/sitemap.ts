import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: "https://caresupport.com",
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: "https://caresupport.com/privacy",
      changeFrequency: "yearly",
      priority: 0.2,
    },
    {
      url: "https://caresupport.com/terms",
      changeFrequency: "yearly",
      priority: 0.2,
    },
  ];
}
