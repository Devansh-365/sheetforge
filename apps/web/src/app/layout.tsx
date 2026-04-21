import type { Metadata, Viewport } from 'next';
import { IBM_Plex_Mono } from 'next/font/google';
import './globals.css';

const ibmPlexMono = IBM_Plex_Mono({
  variable: '--font-mono',
  subsets: ['latin'],
  weight: ['400', '500', '700'],
});

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'https://sheetforge.dev');
const title = 'sheetforge — Google Sheets as a backend that actually behaves like one';
const description =
  'Open-source, race-condition-safe Google Sheets backend. 1000 concurrent writes, 1000 ordered rows. Typed TypeScript & Python SDKs generated from your sheet headers. Hosted SaaS live — or self-host, MIT-licensed.';

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
      sameAs: ['https://github.com/Devansh-365/sheetforge', 'https://github.com/Devansh-365'],
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
            text: 'Yes. Hosted SaaS is live — sign in with Google and connect a Sheet in under a minute. Prefer self-hosting? The full stack (Next.js dashboard, Hono API, write-queue worker) is MIT-licensed and runs locally with one pnpm dev.',
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
            text: 'Yes. The entire stack — queue engine, SDK codegen, dashboard, API — is MIT-licensed on GitHub. Run it on any Node.js host with Postgres and Redis (or Upstash REST). Hosted SaaS is live if you prefer the managed option.',
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
            text: 'Your spreadsheet data never leaves Google. On the hosted SaaS, OAuth tokens and tenant metadata live in our managed Postgres, encrypted at rest; write payloads pass through the Redis queue transiently. Prefer to keep everything on your infrastructure? Self-host and nothing touches a third-party server.',
          },
        },
        {
          '@type': 'Question',
          name: 'How much does sheetforge cost?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Free to start. The hosted SaaS has a free tier — sign in with Google and start connecting Sheets without a card. Self-hosting stays free forever under the MIT license on the OSS packages.',
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
          // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD is a static object we control, and `<` is escaped to `\u003c` so no tag can close the <script> early.
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c'),
          }}
        />
      </head>
      <body className="min-h-screen font-mono">{children}</body>
    </html>
  );
}
