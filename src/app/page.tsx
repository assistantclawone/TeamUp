import TeamUpPage from '@/components/team-up/TeamUpPage';
import { Suspense } from 'react';
import { AdBanner } from '@/components/AdBanner';

function HomePage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'TeamUp - The Ultimate Team Generator',
    operatingSystem: 'WEB',
    applicationCategory: 'Utility',
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.8',
      ratingCount: '1250',
    },
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
  };
  
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Suspense fallback={<div>Loading...</div>}>
        <TeamUpPage />
      </Suspense>
    </>
  );
}

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center p-4 sm:p-8 md:p-12">
      <HomePage />
      <footer className="w-full max-w-6xl mx-auto mt-8">
        <AdBanner />
      </footer>
    </main>
  );
}
