import type { Metadata } from 'next';
import { IBM_Plex_Mono } from 'next/font/google';
import './globals.css';

const ibmPlexMono = IBM_Plex_Mono({
  variable: '--font-mono',
  subsets: ['latin'],
  weight: ['400', '500', '700'],
});

const title =
  'sheetforge — Google Sheets as a backend that actually behaves like one';
const description =
  'Open-source, race-condition-safe Google Sheets backend with typed TypeScript/Python SDKs. Self-host today with one `pnpm dev` — hosted SaaS coming soon.';

export const metadata: Metadata = {
  title,
  description,
  themeColor: '#22c55e',
  openGraph: {
    title,
    description,
    url: 'https://sheetforge.dev',
    siteName: 'sheetforge',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title,
    description,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${ibmPlexMono.variable} antialiased`}>
      <body className="min-h-screen font-mono">{children}</body>
    </html>
  );
}
