import type { Metadata, Viewport } from 'next';
import { IBM_Plex_Mono } from 'next/font/google';
import './globals.css';

const ibmPlexMono = IBM_Plex_Mono({
  variable: '--font-mono',
  subsets: ['latin'],
  weight: ['400', '500', '700'],
});

const SITE_URL = 'https://sheetforge.dev';
const title =
  'sheetforge — Google Sheets as a backend that actually behaves like one';
const description =
  'Open-source, race-condition-safe Google Sheets backend. 1000 concurrent writes, 1000 ordered rows. Typed TypeScript & Python SDKs generated from your sheet headers. Self-host today — hosted SaaS coming soon.';

export const viewport: Viewport = {
  themeColor: '#22c55e',
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: title,
    template: '%s · sheetforge',
  },
  description,
  applicationName: 'sheetforge',
  authors: [{ name: 'Devansh Tiwari', url: 'https://github.com/Devansh-365' }],
  creator: 'Devansh Tiwari',
  publisher: 'sheetforge',
  generator: 'Next.js',
  keywords: [
    'google sheets backend',
    'google sheets api',
    'sheets as a database',
    'sheetdb alternative',
    'sheety alternative',
    'race condition safe',
    'typed typescript sdk',
    'idempotent api',
    'write queue',
    'redis streams',
    'postgres advisory lock',
    'open source google sheets',
    'self-hosted sheets backend',
    'indie dev tools',
    'mvp backend',
  ],
  category: 'technology',
  referrer: 'origin-when-cross-origin',
  alternates: {
    canonical: SITE_URL,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-snippet': -1,
      'max-image-preview': 'large',
      'max-video-preview': -1,
    },
  },
  openGraph: {
    title,
    description,
    url: SITE_URL,
    siteName: 'sheetforge',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title,
    description,
    creator: '@Devansh_365',
  },
  other: {
    'fediverse:creator': '@Devansh-365@github.com',
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'SoftwareApplication',
      '@id': `${SITE_URL}#software`,
      name: 'sheetforge',
      url: SITE_URL,
      applicationCategory: 'DeveloperApplication',
      operatingSystem: 'Cross-platform (Node.js 20+)',
      description,
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
      },
      softwareVersion: 'V0',
      license: 'https://opensource.org/licenses/MIT',
      codeRepository: 'https://github.com/Devansh-365/sheetforge',
      programmingLanguage: ['TypeScript', 'Python'],
      author: {
        '@type': 'Person',
        name: 'Devansh Tiwari',
        url: 'https://github.com/Devansh-365',
      },
      featureList: [
        'Per-sheet serialized write queue',
        'Idempotent retries by key',
        'Typed TypeScript SDK generated from sheet headers',
        'Postgres advisory-lock fencing',
        'Redis Streams consumer groups',
        'Edge-cached reads',
      ],
    },
    {
      '@type': 'Organization',
      '@id': `${SITE_URL}#organization`,
      name: 'sheetforge',
      url: SITE_URL,
      logo: `${SITE_URL}/icon`,
      sameAs: [
        'https://github.com/Devansh-365/sheetforge',
        'https://github.com/Devansh-365',
      ],
    },
    {
      '@type': 'WebSite',
      '@id': `${SITE_URL}#website`,
      url: SITE_URL,
      name: 'sheetforge',
      description,
      publisher: { '@id': `${SITE_URL}#organization` },
      inLanguage: 'en-US',
    },
    {
      '@type': 'FAQPage',
      '@id': `${SITE_URL}#faq`,
      mainEntity: [
        {
          '@type': 'Question',
          name: 'Is sheetforge hosted? Can I sign up right now?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Not yet. sheetforge is self-host only right now — the full stack (Next.js dashboard, Hono API, write-queue worker) runs locally with one pnpm dev. The hosted SaaS is on the roadmap once V1 stabilizes.',
          },
        },
        {
          '@type': 'Question',
          name: 'What is sheetforge?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'sheetforge is a developer-first Google Sheets backend that adds race-condition-safe writes and auto-generated TypeScript/Python SDKs to any spreadsheet. It sits between your app and the Sheets API, serializing writes through a per-sheet queue so you never lose a row.',
          },
        },
        {
          '@type': 'Question',
          name: 'How is sheetforge different from SheetDB, Sheety, or Sheet2API?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Every competitor wraps the Sheets API and forwards your writes directly — which means concurrent POSTs collide and rows go missing. sheetforge routes all writes through a serialized queue backed by Redis Streams and a Postgres advisory lock, so 1000 concurrent writes produce exactly 1000 ordered rows.',
          },
        },
        {
          '@type': 'Question',
          name: 'Can I self-host sheetforge?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Yes — self-hosting is the only way to run it today. The queue engine and SDK codegen are MIT-licensed on GitHub. You can run the stack on any Node.js host with a Postgres database and Redis (or Upstash REST).',
          },
        },
        {
          '@type': 'Question',
          name: 'How does the typed SDK generation work?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: "When you connect a sheet, sheetforge reads your header row and samples the first 50 rows to infer column types. It emits a TypeScript package with strict types (no any) and a Python package with TypedDicts. Run 'sheetforge regen' to regenerate after a schema change.",
          },
        },
        {
          '@type': 'Question',
          name: 'Is my Google Sheets data safe with sheetforge?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Your spreadsheet data never leaves Google. Because sheetforge is self-hosted, OAuth tokens and tenant metadata live in your own Postgres — nothing is sent to a third party. Write payloads pass through your Redis queue transiently.',
          },
        },
        {
          '@type': 'Question',
          name: 'How much does sheetforge cost?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Free. The entire project is open source — clone, run, use. When the hosted SaaS launches it will have a free tier too. Self-hosting stays free under the MIT license on the OSS packages.',
          },
        },
      ],
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${ibmPlexMono.variable} antialiased`}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c'),
          }}
        />
      </head>
      <body className="min-h-screen font-mono">{children}</body>
    </html>
  );
}
