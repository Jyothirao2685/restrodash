import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'RestroDash – The Offline-First POS & Operating System for Restaurants',
  description: 'Enterprise-grade, offline-first restaurant operating system. Collaborative QR dining, multi-station KDS, tableside mobile POS, and thermal printing with zero cloud latency.',
  icons: {
    icon: '/restro-logo.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#ffffff] text-[#333840] antialiased selection:bg-[#181d26] selection:text-[#ffffff]">
        {children}
      </body>
    </html>
  );
}
