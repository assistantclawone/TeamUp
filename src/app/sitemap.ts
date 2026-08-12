import { MetadataRoute } from 'next';
import { languages } from '../locales/languages';

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://team-up-app.com';

  const languageAlternates = Object.keys(languages).reduce((acc, lang) => {
    acc[lang] = `${siteUrl}?lang=${lang}`;
    return acc;
  }, {} as Record<string, string>);

  return [
    {
      url: siteUrl,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 1,
      alternates: {
        languages: languageAlternates,
      },
    },
    {
      url: `${siteUrl}/login`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.5,
    },
  ];
}
