'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { Card, CardContent } from './ui/card';
import { cn } from '@/lib/utils';

declare global {
  interface Window {
    adsbygoogle: any[];
  }
}

export function AdBanner({ className }: { className?: string }) {
  const adRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    // Ensure this code runs only in the browser
    if (typeof window !== 'undefined') {
        try {
            (window.adsbygoogle = window.adsbygoogle || []).push({});
        } catch (err) {
            console.error('Error with Google AdSense:', err);
        }
    }
  }, [pathname]);

  return (
    <Card className={cn('w-full flex items-center justify-center min-h-[100px]', className)}>
      <CardContent className="p-2 w-full">
        <div key={pathname} ref={adRef} className="w-full">
          <ins
            className="adsbygoogle"
            style={{ display: 'block' }}
            data-ad-client={process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID || 'ca-pub-XXXXXXXXXXXXXXXX'} // Fallback placeholder
            data-ad-slot="YOUR_AD_SLOT_ID" // TODO: Replace with your ad slot ID
            data-ad-format="auto"
            data-full-width-responsive="true"
          ></ins>
        </div>
      </CardContent>
    </Card>
  );
}
