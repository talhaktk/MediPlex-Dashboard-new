import { MetadataRoute } from 'next';

const BASE_URL = 'https://mediplex.io';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: BASE_URL,                  lastModified: now, changeFrequency: 'weekly',  priority: 1.0 },
    { url: `${BASE_URL}/features`,    lastModified: now, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${BASE_URL}/onboarding`,  lastModified: now, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${BASE_URL}/contact`,     lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE_URL}/login`,       lastModified: now, changeFrequency: 'yearly',  priority: 0.4 },
  ];
}
