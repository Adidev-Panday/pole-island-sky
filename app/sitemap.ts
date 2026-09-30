import type { MetadataRoute } from 'next';

const SITE_URL = 'https://pole-island.adidevpanday.com';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: SITE_URL,
      lastModified: new Date(),
    },
  ];
}
