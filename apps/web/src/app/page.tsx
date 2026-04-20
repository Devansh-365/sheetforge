'use client';

import { ChevronDownIcon, CopyIcon, OpenCodeLogo } from '@/components/icons';
import { useState } from 'react';

// Real SDK usage — what devs write after connecting a sheet.
const usageSnippets: Record<string, string> = {
  typescript: `// 1. download client.ts from your sheet page (typed from your headers)
// 2. write the POST:
import { createWaitlistClient } from './client';

const waitlist = createWaitlistClient({ apiKey: 'sk_live_…' });

await waitlist.create(
  { email: 'hi@example.com', source: 'hn' },
  { idempotencyKey: crypto.randomUUID() },
);
// → { writeId, status: 'enqueued' | 'replayed' }`,
  python: `# pip install sheetforge  (generated client — coming soon)
from sheetforge import WaitlistClient
from uuid import uuid4

waitlist = WaitlistClient(api_key='sk_live_…')

waitlist.create(
    {'email': 'hi@example.com', 'source': 'hn'},
    idempotency_key=str(uuid4()),
)
# → { writeId, status: 'enqueued' | 'replayed' }`,
  curl: `# self-hosted — point at your own API host
curl -X POST http://localhost:3001/v1/sheets/<sheetId>/rows \\
  -H 'Authorization: Bearer sk_live_…' \\
  -H 'Idempotency-Key: abc-123' \\
  -d '{"email":"hi@example.com","source":"hn"}'
# → HTTP 202 { writeId, status: 'enqueued' }`,
};

const features = [
  {
    title: 'ACID-ish writes',
    desc: 'Per-sheet serialized queue; 1000 concurrent POSTs, 1000 rows written in order — guaranteed.',
  },
  {
    title: 'Typed SDKs',
    desc: "TypeScript and Python SDKs generated live from your sheet's headers — no any types, ever.",
  },
  {
    title: 'Fencing-token safety',
    desc: "Zombie workers can't overwrite; stale leases are rejected before they touch your data.",
  },
  {
    title: 'Idempotency',
    desc: 'Every write accepts an Idempotency-Key header — retries are safe by default.',
  },
  {
    title: 'Schema validation',
    desc: 'Rules derived from Sheets data validation; bad writes return field-level 400 errors.',
  },
  {
    title: 'Edge-cached reads',
    desc: 'Cloudflare-cached GETs with sub-100ms response globally — no polling required.',
  },
  {
    title: 'OSS core',
    desc: 'MIT-licensed queue engine and SDK codegen on GitHub — audit it, fork it, self-host it.',
  },
];

const faqItems = [
  {
    q: 'Is sheetforge hosted? Can I sign up right now?',
    a: 'Not yet. Right now sheetforge is self-host only — the full stack (Next.js dashboard, Hono API, write-queue worker) runs locally with one `pnpm dev`. The hosted SaaS at sheetforge.dev is on the roadmap once V1 stabilizes. For now: clone, set env vars, go. The self-host guide on GitHub walks through it end-to-end.',
  },
  {
    q: 'What is sheetforge?',
    a: 'sheetforge is a developer-first Google Sheets backend that adds race-condition-safe writes and auto-generated TypeScript/Python SDKs to any spreadsheet. It sits between your app and the Sheets API, serializing writes through a per-sheet queue so you never lose a row.',
  },
  {
    q: 'How is this different from SheetDB, Sheety, or Sheet2API?',
    a: 'Every competitor wraps the Sheets API and forwards your writes directly — which means concurrent POSTs collide and rows go missing. sheetforge routes all writes through a serialized queue backed by Upstash Redis, so 1000 concurrent writes produce exactly 1000 rows. None of the incumbents offer typed SDKs generated from your live schema either.',
  },
  {
    q: 'Do I have to give you OAuth access to my whole Drive?',
    a: 'No — and because you self-host, the OAuth app is your own Google Cloud project. You authorize only the specific spreadsheets you connect. We request the narrowest OAuth scopes Google allows (spreadsheets.readonly for reads, spreadsheets for writes on connected sheets). You can revoke access at any time from your Google account.',
  },
  {
    q: "What happens when I hit Google's rate limits?",
    a: "The write queue handles Google's 300 req/min/project ceiling transparently. Writes back-pressure gracefully with exponential backoff — your API call returns a writeId immediately and the queue drains in the background. You never see a 429 bubble up to your app.",
  },
  {
    q: 'How does the typed SDK generation work?',
    a: 'When you connect a sheet, we read your header row and sample the first 50 rows to infer column types (string, number, boolean, ISODate, or enum from dropdown). We emit a TypeScript package with strict types (no any) and a Python package with TypedDicts. Run sheetforge regen in the CLI to regenerate after a schema change.',
  },
  {
    q: 'Is my data safe — where do you store it?',
    a: "Your spreadsheet data never leaves Google's infrastructure. Because sheetforge is self-hosted for now, even the OAuth tokens and tenant metadata (project names, API key hashes, schema snapshots) sit in your own Postgres — nothing is sent to a third party. Write payloads pass through your Redis queue transiently and are deleted after acknowledgment.",
  },
  {
    q: 'How much does it cost?',
    a: "Free. The entire project is open source — clone it, run it, use it. When the hosted SaaS launches it will have a free tier too. Self-hosting is always free under the MIT license on the OSS packages.",
  },
];

function Header() {
  return (
    <header
      className="sticky top-0 z-10 flex items-center justify-between min-h-[80px] px-[80px] border-b"
      style={{ backgroundColor: '#131010' }}
    >
      <a href="/" aria-label="sheetforge home">
        <OpenCodeLogo />
      </a>
      <nav className="flex items-center gap-8">
        <a
          href="https://github.com/Devansh-365/sheetforge"
          className="text-[#b8b2b2] hover:text-[#f2eded] transition-colors"
          target="_blank"
          rel="noopener noreferrer"
        >
          GitHub <span className="text-[#22c55e]">[★]</span>
        </a>
        <a
          href="#faq"
          className="text-[#b8b2b2] hover:text-[#f2eded] transition-colors"
        >
          FAQ
        </a>
        <a
          href="https://github.com/Devansh-365/sheetforge#quickstart"
          target="_blank"
          rel="noopener noreferrer"
          className="rounded px-4 py-2 font-medium transition-opacity hover:opacity-90 cursor-pointer"
          style={{ backgroundColor: '#22c55e', color: '#0c0c0e' }}
        >
          Self-host it →
        </a>
      </nav>
    </header>
  );
}

function SelfHostBanner() {
  return (
    <div
      className="px-[80px] py-3 border-b flex items-center justify-center gap-2 text-sm"
      style={{
        backgroundColor: '#0f1a12',
        borderColor: '#14532d',
        color: '#86efac',
      }}
    >
      <span
        className="inline-block w-2 h-2 rounded-full"
        style={{ backgroundColor: '#22c55e' }}
        aria-hidden="true"
      />
      <span>
        Self-host only for now — hosted SaaS coming soon. Backend runs locally
        with one{' '}
        <code
          className="px-1.5 py-0.5 rounded"
          style={{ backgroundColor: '#14532d', color: '#bbf7d0' }}
        >
          pnpm dev
        </code>
        .
      </span>
    </div>
  );
}

function HeroSection() {
  const tabs = Object.keys(usageSnippets) as Array<keyof typeof usageSnippets>;
  const [activeTab, setActiveTab] =
    useState<keyof typeof usageSnippets>('typescript');
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(usageSnippets[activeTab]);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section
      className="px-[80px] py-[64px] border-b"
      style={{ borderColor: '#3d3838' }}
    >
      <div className="flex items-center gap-3 mb-8">
        <span
          className="border px-2 py-0.5 text-sm font-medium"
          style={{ borderColor: '#22c55e', color: '#22c55e' }}
        >
          OSS
        </span>
        <p className="text-[#b8b2b2]">
          TypeScript SDKs generated live from your sheet headers — clone &
          self-host in under a minute.{' '}
          <a
            href="https://github.com/Devansh-365/sheetforge#quickstart"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#4ade80] hover:text-[#86efac] transition-colors"
          >
            Read the guide →
          </a>
        </p>
      </div>

      <h1 className="text-[38px] font-bold leading-[57px] text-[#f2eded] mb-4">
        The Google Sheets backend that behaves like a real database
      </h1>
      <p className="text-[#b8b2b2] mb-8 leading-[24px]">
        Race-condition-safe writes, typed SDKs, no polling.
        <br />
        Built for indie devs shipping MVPs — fully open source, self-hosted
        today, managed hosting on the way.
      </p>

      <div className="flex items-center gap-3 mb-8 flex-wrap">
        <a
          href="https://github.com/Devansh-365/sheetforge"
          target="_blank"
          rel="noopener noreferrer"
          className="rounded px-6 py-2 font-medium transition-opacity hover:opacity-90 cursor-pointer"
          style={{ backgroundColor: '#22c55e', color: '#0c0c0e' }}
        >
          Star on GitHub ★
        </a>
        <a
          href="https://github.com/Devansh-365/sheetforge#quickstart"
          target="_blank"
          rel="noopener noreferrer"
          className="rounded px-6 py-2 border transition-colors cursor-pointer hover:text-[#f2eded]"
          style={{ borderColor: '#22c55e', color: '#4ade80' }}
        >
          Self-host quickstart →
        </a>
      </div>

      <p style={{ color: '#7f7a7a' }} className="text-sm mb-3">
        Once you connect a sheet, your write path looks like this:
      </p>
      <div
        className="border rounded"
        style={{ borderColor: '#3d3838', backgroundColor: '#131010' }}
      >
        <div
          className="flex items-center justify-between border-b"
          style={{ borderColor: '#3d3838' }}
        >
          <div className="flex">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className="px-6 py-3 text-sm transition-colors relative cursor-pointer"
                style={{
                  color: activeTab === tab ? '#22c55e' : '#7f7a7a',
                  fontWeight: activeTab === tab ? 700 : 400,
                }}
              >
                {tab}
                {activeTab === tab && (
                  <span
                    className="absolute bottom-0 left-0 right-0 h-[2px]"
                    style={{ backgroundColor: '#22c55e' }}
                  />
                )}
              </button>
            ))}
          </div>
          <button
            onClick={handleCopy}
            className="text-[#7f7a7a] hover:text-[#4ade80] transition-colors px-6 text-xs cursor-pointer"
            title="Copy to clipboard"
          >
            {copied ? (
              <span style={{ color: '#22c55e' }}>Copied!</span>
            ) : (
              <CopyIcon />
            )}
          </button>
        </div>
        <pre
          className="px-6 py-4 text-sm overflow-x-auto leading-[22px]"
          style={{ color: '#b8b2b2' }}
        >
          <code>{usageSnippets[activeTab]}</code>
        </pre>
      </div>
    </section>
  );
}

function FeaturesSection() {
  return (
    <section
      className="px-[80px] py-[64px] border-b"
      style={{ borderColor: '#3d3838' }}
    >
      <h2 className="text-[16px] font-bold text-[#f2eded] mb-3">
        What is sheetforge?
      </h2>
      <p className="text-[#b8b2b2] mb-8 leading-[24px]">
        A race-condition-safe REST API layer for Google Sheets with
        auto-generated TypeScript and Python SDKs — the backend your indie
        project can actually trust in production.
      </p>
      <ul className="space-y-3">
        {features.map((f) => (
          <li
            key={f.title}
            className="flex items-start gap-2 text-[16px] leading-[24px]"
          >
            <span style={{ color: '#22c55e' }}>[*]</span>
            <span>
              <strong className="text-[#f2eded] font-medium">{f.title}</strong>{' '}
              <span className="text-[#b8b2b2]">{f.desc}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function StatsSection() {
  return (
    <section
      className="px-[80px] py-[64px] border-b"
      style={{ borderColor: '#3d3838' }}
    >
      <h2 className="text-[16px] font-bold text-[#f2eded] mb-3">
        Built on numbers that matter
      </h2>
      <p className="text-[#b8b2b2] leading-[32px] mb-8">
        <span style={{ color: '#22c55e' }}>[*]</span> The write queue handles
        1000 concurrent POSTs to the same sheet and produces exactly 1000 rows,
        in order — zero race conditions, sub-100ms cached reads globally.
      </p>
      <div className="grid grid-cols-3 gap-6">
        <div
          className="border rounded p-6 flex flex-col gap-3"
          style={{ borderColor: '#3d3838' }}
        >
          <svg
            width="40"
            height="40"
            viewBox="0 0 40 40"
            fill="none"
            aria-hidden="true"
          >
            <title>Parallel writes converging into an ordered stream</title>
            <path
              d="M4 10 L18 10 L24 20"
              stroke="#22c55e"
              strokeOpacity="0.45"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M4 20 L18 20 L24 20"
              stroke="#22c55e"
              strokeOpacity="0.7"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M4 30 L18 30 L24 20"
              stroke="#22c55e"
              strokeOpacity="0.45"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M24 20 L36 20"
              stroke="#22c55e"
              strokeWidth="3"
              strokeLinecap="round"
            />
          </svg>
          <p
            className="text-2xl font-bold"
            style={{ color: '#22c55e' }}
          >
            1000
          </p>
          <p className="text-[#b8b2b2] text-sm">Concurrent writes, in order</p>
        </div>
        <div
          className="border rounded p-6 flex flex-col gap-3"
          style={{ borderColor: '#3d3838' }}
        >
          <svg
            width="40"
            height="40"
            viewBox="0 0 40 40"
            fill="none"
            aria-hidden="true"
          >
            <title>Shielded queue — no race conditions</title>
            <path
              d="M20 4 L6 9 V20 C6 28 12 34 20 37 C28 34 34 28 34 20 V9 Z"
              stroke="#22c55e"
              strokeWidth="2"
              strokeLinejoin="round"
              fill="#22c55e"
              fillOpacity="0.08"
            />
            <path
              d="M14 20 L18 24 L26 15"
              stroke="#22c55e"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <p
            className="text-2xl font-bold"
            style={{ color: '#22c55e' }}
          >
            0
          </p>
          <p className="text-[#b8b2b2] text-sm">Race conditions</p>
        </div>
        <div
          className="border rounded p-6 flex flex-col gap-3"
          style={{ borderColor: '#3d3838' }}
        >
          <svg
            width="40"
            height="40"
            viewBox="0 0 40 40"
            fill="none"
            aria-hidden="true"
          >
            <title>Edge-cached read — sub-100ms latency bolt</title>
            <path
              d="M22 3 L8 22 H18 L16 37 L32 16 H22 L24 3 Z"
              stroke="#22c55e"
              strokeWidth="2"
              strokeLinejoin="round"
              fill="#22c55e"
              fillOpacity="0.15"
            />
          </svg>
          <p
            className="text-2xl font-bold"
            style={{ color: '#22c55e' }}
          >
            &lt;100ms
          </p>
          <p className="text-[#b8b2b2] text-sm">p50 read latency</p>
        </div>
      </div>
    </section>
  );
}

function PrivacySection() {
  return (
    <section
      className="px-[80px] py-[64px] border-b"
      style={{ borderColor: '#3d3838' }}
    >
      <h2 className="text-[16px] font-bold text-[#f2eded] mb-3">
        Your data never leaves your infrastructure
      </h2>
      <p className="text-[#b8b2b2] leading-[24px]">
        <span style={{ color: '#22c55e' }}>[*]</span> Your spreadsheet data
        stays in Google Sheets. Because you self-host, even the OAuth tokens
        and tenant metadata live in your own Postgres — nothing ever hits a
        third-party server.
      </p>
    </section>
  );
}

function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section
      id="faq"
      className="px-[80px] py-[64px] border-b"
      style={{ borderColor: '#3d3838' }}
    >
      <h2 className="text-[16px] font-bold text-[#f2eded] mb-8">FAQ</h2>
      <div className="space-y-0">
        {faqItems.map((item, i) => (
          <div
            key={i}
            className="border-b"
            style={{ borderColor: '#3d3838' }}
          >
            <button
              onClick={() => setOpenIndex(openIndex === i ? null : i)}
              className="w-full flex items-center justify-between py-4 text-left text-[#f2eded] hover:text-[#4ade80] transition-colors cursor-pointer"
            >
              <span>{item.q}</span>
              <ChevronDownIcon
                className={`w-5 h-5 transition-transform duration-200 ${
                  openIndex === i ? 'rotate-180' : ''
                }`}
              />
            </button>
            {openIndex === i && (
              <div className="pb-4 text-[#b8b2b2] leading-[24px]">
                {item.a}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

function ZenSection() {
  return (
    <section
      className="px-[80px] py-[64px] border-b"
      style={{ borderColor: '#3d3838' }}
    >
      <h2 className="text-[16px] font-bold text-[#f2eded] mb-3">
        Self-host today. Hosted SaaS on the way.
      </h2>
      <p className="text-[#b8b2b2] leading-[32px] mb-6">
        Right now, sheetforge runs on your own machine — one{' '}
        <code
          className="px-1.5 py-0.5 rounded text-sm"
          style={{ backgroundColor: '#14532d', color: '#bbf7d0' }}
        >
          pnpm dev
        </code>{' '}
        boots the Next.js dashboard, Hono API and queue worker. The OSS core
        (MIT queue engine and SDK codegen) is on GitHub. A hosted SaaS is
        planned once V1 stabilizes; until then, you own the stack.
      </p>
      <a
        href="https://github.com/Devansh-365/sheetforge#quickstart"
        className="inline-block font-medium transition-colors"
        style={{ color: '#4ade80' }}
        target="_blank"
        rel="noopener noreferrer"
      >
        Read the self-host guide →
      </a>
    </section>
  );
}

function Footer() {
  return (
    <footer className="px-[80px] py-4 flex items-center justify-between text-sm text-[#4a4545]">
      <span>&copy;2026 sheetforge · MIT OSS · self-hosted</span>
      <div className="flex items-center gap-6">
        <a
          href="#faq"
          className="hover:text-[#4ade80] transition-colors"
        >
          FAQ
        </a>
        <a
          href="https://github.com/Devansh-365/sheetforge"
          className="hover:text-[#4ade80] transition-colors"
          target="_blank"
          rel="noopener noreferrer"
        >
          GitHub
        </a>
        <span>English</span>
      </div>
    </footer>
  );
}

export default function Home() {
  return (
    <main>
      <div
        className="mx-auto border-l border-r"
        style={{ maxWidth: '1080px', borderColor: '#3d3838' }}
      >
        <Header />
        <SelfHostBanner />
        <HeroSection />
        <FeaturesSection />
        <StatsSection />
        <PrivacySection />
        <FAQSection />
        <ZenSection />
      </div>
      <div className="mx-auto" style={{ maxWidth: '1080px' }}>
        <Footer />
      </div>
    </main>
  );
}
