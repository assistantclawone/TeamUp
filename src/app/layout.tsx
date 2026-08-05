import type { Metadata } from 'next';
import './globals.css';
import { LanguageProvider } from '@/contexts/language-context';
import { Toaster } from '@/components/ui/toaster';
import { cn } from '@/lib/utils';
import { FirebaseClientProvider } from '@/firebase';
import { Suspense } from 'react';
import { Inter } from 'next/font/google';
import Script from 'next/script';

const inter = Inter({ subsets: ['latin'] });

// TODO: Replace with your own Google AdSense client ID
const ADSENSE_CLIENT_ID = 'ca-pub-XXXXXXXXXXXXXXXX';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://team-up-app.com';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'TeamUp - The Ultimate Team Generator',
    template: `%s | TeamUp`,
  },
  description:
    'Easily create random teams for projects, sports, and more. Assign roles, set rules for who must or must not be on the same team, and generate balanced groups in seconds. Supports multiple languages and is optimized for quick, intuitive use.',
  keywords: ['team generator', 'random group generator', 'group maker', 'random teams', 'team randomizer', 'project teams', 'sports teams', 'group generator', 'teambuilding'],
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    title: 'TeamUp - The Ultimate Team Generator',
    description: 'The easiest way to create balanced and random teams for any occasion.',
    url: siteUrl,
    siteName: 'TeamUp',
    images: [
      {
        url: `${siteUrl}/og-image.png`, // IMPORTANT: You should create this image and place it in the /public folder
        width: 1200,
        height: 630,
        alt: 'TeamUp App Interface',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TeamUp - The Ultimate Team Generator',
    description: 'The easiest way to create balanced and random teams for any occasion.',
    // creator: '@your_twitter_handle', // Optional: Replace with your Twitter handle
    images: [`${siteUrl}/og-image.png`],
  },
  alternates: {
    canonical: '/',
  },
  manifest: '/manifest.json'
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
       <head>
          <Script
            async
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT_ID}`}
            crossOrigin="anonymous"
            strategy="afterInteractive"
          />
       </head>
       <body className={cn('min-h-screen bg-background font-sans antialiased', inter.className)}>
        <Suspense>
          <FirebaseClientProvider>
            <LanguageProvider>
              {children}
              <Toaster />
            </LanguageProvider>
          </FirebaseClientProvider>
        </Suspense>
      </body>
    </html>
  );
}
