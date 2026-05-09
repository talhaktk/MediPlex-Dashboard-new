import { MetadataRoute } from 'next';

const BASE_URL = 'https://mediplex.io';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/features', '/contact', '/onboarding'],
        disallow: ['/dashboard/', '/orgdashboard/', '/superadmin/', '/api/', '/patient/'],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL,
  };
}
