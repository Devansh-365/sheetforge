import type { MetadataRoute } from 'next';

const BASE_URL = 'https://sheetforge.dev';

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return [
    {
      url: `${BASE_URL}/`,
      lastModified,
      changeFrequency: 'weekly',
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/#faq`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/signin`,
      lastModified,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
  ];
}
