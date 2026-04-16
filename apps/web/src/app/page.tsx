"use client";

import { useState } from "react";
import { OpenCodeLogo, DownloadIcon, CopyIcon, ChevronDownIcon } from "@/components/icons";

const installCommands: Record<string, string> = {
  curl: "curl -fsSL https://acid-sheets.dev/install | bash",
  npm: "npm i @acid-sheets/sdk",
  pnpm: "pnpm add @acid-sheets/sdk",
  bun: "bun add @acid-sheets/sdk",
  pip: "pip install acid-sheets",
};

const features = [
  { title: "ACID-ish writes", desc: "Per-sheet serialized queue; 1000 concurrent POSTs, 1000 rows written in order — guaranteed." },
  { title: "Typed SDKs", desc: "TypeScript and Python SDKs generated live from your sheet's headers — no any types, ever." },
  { title: "Fencing-token safety", desc: "Zombie workers can't overwrite; stale leases are rejected before they touch your data." },
  { title: "Idempotency", desc: "Every write accepts an Idempotency-Key header — retries are safe by default." },
  { title: "Schema validation", desc: "Rules derived from Sheets data validation; bad writes return field-level 400 errors." },
  { title: "Edge-cached reads", desc: "Cloudflare-cached GETs with sub-100ms response globally — no polling required." },
  { title: "OSS core", desc: "MIT-licensed queue engine and SDK codegen on GitHub — audit it, fork it, self-host it." },
];

const faqItems = [
  {
    q: "What is ACID-ish Sheets?",
    a: "ACID-ish Sheets is a developer-first Google Sheets backend that adds race-condition-safe writes and auto-generated TypeScript/Python SDKs to any spreadsheet. It sits between your app and the Sheets API, serializing writes through a per-sheet queue so you never lose a row.",
  },
  {
    q: "How is this different from SheetDB, Sheety, or Sheet2API?",
    a: "Every competitor wraps the Sheets API and forwards your writes directly — which means concurrent POSTs collide and rows go missing. ACID-ish Sheets routes all writes through a serialized queue backed by Upstash Redis, so 1000 concurrent writes produce exactly 1000 rows. None of the incumbents offer typed SDKs generated from your live schema either.",
  },
  {
    q: "Do I have to give you OAuth access to my whole Drive?",
    a: "No. You authorize only the specific spreadsheets you connect. We request the narrowest OAuth scopes Google allows (spreadsheets.readonly for reads, spreadsheets for writes on connected sheets). You can revoke access at any time from your Google account.",
  },
  {
    q: "What happens when I hit Google's rate limits?",
    a: "The write queue handles Google's 300 req/min/project ceiling transparently. Writes back-pressure gracefully with exponential backoff — your API call returns a writeId immediately and the queue drains in the background. You never see a 429 bubble up to your app.",
  },
  {
    q: "Can I self-host?",
    a: "Yes. The queue engine and SDK codegen are MIT-licensed on GitHub. You can run the queue worker on any Node.js host with an Upstash Redis connection. The hosted SaaS is optional — it just saves you the setup time.",
  },
  {
    q: "How does the typed SDK generation work?",
    a: "When you connect a sheet, we read your header row and sample the first 50 rows to infer column types (string, number, boolean, ISODate, or enum from dropdown). We emit a TypeScript package with strict types (no any) and a Python package with TypedDicts. Run acid-sheets regen in the CLI to regenerate after a schema change.",
  },
  {
    q: "Is my data safe — where do you store it?",
    a: "Your spreadsheet data never leaves Google's infrastructure. ACID-ish Sheets stores only OAuth refresh tokens and tenant metadata (project names, API key hashes, schema snapshots) in our Postgres database, encrypted at rest. Write payloads pass through our Redis queue transiently and are deleted after acknowledgment.",
  },
  {
    q: "How much does it cost?",
    a: "Free at launch. We're shipping V1 as a free hosted SaaS to validate demand and gather real usage data before introducing any pricing. Self-hosting is always free (MIT license). Join the waitlist to be notified when paid tiers are introduced.",
  },
];

function Header() {
  return (
    <header
      className="sticky top-0 z-10 flex items-center justify-between min-h-[80px] px-[80px] border-b"
      style={{ backgroundColor: "#131010" }}
    >
      <a href="/" aria-label="ACID-ish Sheets home">
        <OpenCodeLogo />
      </a>
      <nav className="flex items-center gap-8">
        <a
          href="https://github.com/acid-sheets/acid-sheets"
          className="text-[#b8b2b2] hover:text-[#f2eded] transition-colors"
          target="_blank"
          rel="noopener noreferrer"
        >
          GitHub <span className="text-[#7f7a7a]">[★]</span>
        </a>
        <a href="https://acid-sheets.dev/docs" className="text-[#b8b2b2] hover:text-[#f2eded] transition-colors">
          Docs
        </a>
        <a href="https://acid-sheets.dev/pricing" className="text-[#b8b2b2] hover:text-[#f2eded] transition-colors">
          Pricing
        </a>
        <a
          href="https://acid-sheets.dev/install"
          className="flex items-center gap-2 rounded px-4 py-2 text-[#131010] font-medium transition-opacity hover:opacity-90"
          style={{ backgroundColor: "#f2eded" }}
        >
          <DownloadIcon className="w-[18px] h-[18px]" />
          Install
        </a>
      </nav>
    </header>
  );
}

function HeroSection() {
  const [activeTab, setActiveTab] = useState("curl");
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(installCommands[activeTab]);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section className="px-[80px] py-[64px] border-b" style={{ borderColor: "#3d3838" }}>
      {/* Announcement banner */}
      <div className="flex items-center gap-3 mb-8">
        <span
          className="border px-2 py-0.5 text-sm font-medium"
          style={{ borderColor: "#3d3838", color: "#f2eded" }}
        >
          New
        </span>
        <p className="text-[#b8b2b2]">
          TypeScript and Python SDKs generated live from your sheet schema.{" "}
          <a href="https://acid-sheets.dev/docs/sdk" className="text-[#7f7a7a] hover:text-[#b8b2b2] transition-colors">
            See the codegen
          </a>
        </p>
      </div>

      {/* Main heading */}
      <h1 className="text-[38px] font-bold leading-[57px] text-[#f2eded] mb-4">
        The Google Sheets backend that behaves like a real database
      </h1>
      <p className="text-[#b8b2b2] mb-8 leading-[24px]">
        Race-condition-safe writes, typed SDKs, no polling.
        <br />
        Built for indie devs shipping MVPs.
      </p>

      {/* Install tabs */}
      <div className="border rounded" style={{ borderColor: "#3d3838", backgroundColor: "#131010" }}>
        <div className="flex border-b" style={{ borderColor: "#3d3838" }}>
          {Object.keys(installCommands).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="px-6 py-3 text-sm transition-colors relative"
              style={{
                color: activeTab === tab ? "#f2eded" : "#7f7a7a",
                fontWeight: activeTab === tab ? 700 : 400,
              }}
            >
              {tab}
              {activeTab === tab && (
                <span
                  className="absolute bottom-0 left-0 right-0 h-[2px]"
                  style={{ backgroundColor: "#f2eded" }}
                />
              )}
            </button>
          ))}
        </div>
        <div className="flex items-center justify-between px-6 py-4">
          <code className="text-[#b8b2b2]">
            {installCommands[activeTab].split(activeTab === "curl" ? "acid-sheets.dev" : "").map((part, i, arr) => {
              if (activeTab === "curl" && i === 0) {
                return (
                  <span key={i}>
                    {part}
                    <span className="text-[#f2eded] font-bold">acid-sheets.dev</span>
                  </span>
                );
              }
              if (activeTab === "curl" && i === 1) {
                return <span key={i}>{part}</span>;
              }
              return <span key={i}>{installCommands[activeTab]}</span>;
            })}
          </code>
          <button
            onClick={handleCopy}
            className="text-[#7f7a7a] hover:text-[#b8b2b2] transition-colors ml-4"
            title="Copy to clipboard"
          >
            {copied ? "Copied!" : <CopyIcon />}
          </button>
        </div>
      </div>
    </section>
  );
}

function VideoSection() {
  return (
    <section className="border-b" style={{ borderColor: "#3d3838" }}>
      <video
        autoPlay
        loop
        muted
        playsInline
        poster="/images/acid-sheets-poster.png"
        className="w-full"
      >
        <source src="/videos/acid-sheets-demo.mp4" type="video/mp4" />
        Your browser does not support the video tag.
      </video>
    </section>
  );
}

function FeaturesSection() {
  return (
    <section className="px-[80px] py-[64px] border-b" style={{ borderColor: "#3d3838" }}>
      <h3 className="text-[16px] font-bold text-[#f2eded] mb-3">What is ACID-ish Sheets?</h3>
      <p className="text-[#b8b2b2] mb-8 leading-[24px]">
        A race-condition-safe REST API layer for Google Sheets with auto-generated TypeScript and Python SDKs — the backend your indie project can actually trust in production.
      </p>
      <ul className="space-y-3">
        {features.map((f) => (
          <li key={f.title} className="flex items-start gap-2 text-[16px] leading-[24px]">
            <span className="text-[#716b6a]">[*]</span>
            <span>
              <strong className="text-[#f2eded] font-medium">{f.title}</strong>{" "}
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
    <section className="px-[80px] py-[64px] border-b" style={{ borderColor: "#3d3838" }}>
      <h3 className="text-[16px] font-bold text-[#f2eded] mb-3">Built on numbers that matter</h3>
      <p className="text-[#b8b2b2] leading-[32px] mb-8">
        <span className="text-[#716b6a]">[*]</span> The write queue handles 1000 concurrent POSTs to the same sheet and produces exactly 1000 rows, in order — zero race conditions, sub-100ms cached reads globally.
      </p>
      <div className="grid grid-cols-3 gap-6">
        <div className="border rounded p-6" style={{ borderColor: "#3d3838" }}>
          <p className="text-[#7f7a7a] text-sm mb-2">Fig 1.</p>
          <p className="text-[#f2eded] text-2xl font-bold">1000</p>
          <p className="text-[#b8b2b2] text-sm">Concurrent writes, in order</p>
        </div>
        <div className="border rounded p-6" style={{ borderColor: "#3d3838" }}>
          <p className="text-[#7f7a7a] text-sm mb-2">Fig 2.</p>
          <p className="text-[#f2eded] text-2xl font-bold">0</p>
          <p className="text-[#b8b2b2] text-sm">Race conditions</p>
        </div>
        <div className="border rounded p-6" style={{ borderColor: "#3d3838" }}>
          <p className="text-[#7f7a7a] text-sm mb-2">Fig 3.</p>
          <p className="text-[#f2eded] text-2xl font-bold">&lt;100ms</p>
          <p className="text-[#b8b2b2] text-sm">p50 read latency</p>
        </div>
      </div>
    </section>
  );
}

function PrivacySection() {
  return (
    <section className="px-[80px] py-[64px] border-b" style={{ borderColor: "#3d3838" }}>
      <h3 className="text-[16px] font-bold text-[#f2eded] mb-3">Your data never leaves Google Sheets</h3>
      <p className="text-[#b8b2b2] leading-[24px]">
        <span className="text-[#716b6a]">[*]</span> Your data never leaves Google Sheets. We store only OAuth tokens and tenant metadata in our database, encrypted at rest.{" "}
        <a href="https://acid-sheets.dev/privacy" className="text-[#7f7a7a] hover:text-[#b8b2b2] transition-colors underline">
          Learn more about privacy
        </a>
        .
      </p>
    </section>
  );
}

function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section className="px-[80px] py-[64px] border-b" style={{ borderColor: "#3d3838" }}>
      <h3 className="text-[16px] font-bold text-[#f2eded] mb-8">FAQ</h3>
      <div className="space-y-0">
        {faqItems.map((item, i) => (
          <div key={i} className="border-b" style={{ borderColor: "#3d3838" }}>
            <button
              onClick={() => setOpenIndex(openIndex === i ? null : i)}
              className="w-full flex items-center justify-between py-4 text-left text-[#f2eded] hover:text-[#b8b2b2] transition-colors"
            >
              <span>{item.q}</span>
              <ChevronDownIcon
                className={`w-5 h-5 text-[#7f7a7a] transition-transform duration-200 ${
                  openIndex === i ? "rotate-180" : ""
                }`}
              />
            </button>
            {openIndex === i && (
              <div className="pb-4 text-[#b8b2b2] leading-[24px]">{item.a}</div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

function ZenSection() {
  return (
    <section className="px-[80px] py-[64px] border-b" style={{ borderColor: "#3d3838" }}>
      <h3 className="text-[16px] font-bold text-[#f2eded] mb-3">
        Hosted SaaS or self-host — both work
      </h3>
      <p className="text-[#b8b2b2] leading-[32px] mb-6">
        The hosted SaaS gets you from sheet URL to typed SDK in under 60 seconds — no infra required.
        The OSS core (MIT-licensed queue engine and codegen) is on GitHub if you prefer to run it yourself.
        Either way, the same write-queue guarantees apply.
      </p>
      <a
        href="https://acid-sheets.dev/docs/self-host"
        className="text-[#7f7a7a] hover:text-[#b8b2b2] transition-colors underline"
      >
        Read the self-host guide
      </a>
    </section>
  );
}

function NewsletterSection() {
  return (
    <section className="px-[80px] py-[64px] border-b" style={{ borderColor: "#3d3838" }}>
      <h3 className="text-[16px] font-bold text-[#f2eded] mb-3">
        Join the waitlist for the HN launch
      </h3>
      <p className="text-[#b8b2b2] mb-6 leading-[24px]">Get notified when we go live — early access, no spam.</p>
      <div className="flex gap-3">
        <input
          type="email"
          placeholder="Email"
          className="border rounded px-4 py-2 bg-transparent text-[#f2eded] placeholder-[#7f7a7a] flex-1 max-w-sm focus:outline-none focus:border-[#7f7a7a] transition-colors"
          style={{ borderColor: "#3d3838" }}
        />
        <button
          className="rounded px-6 py-2 font-medium transition-opacity hover:opacity-90"
          style={{ backgroundColor: "#f2eded", color: "#131010" }}
        >
          Subscribe
        </button>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="px-[80px] py-4 flex items-center justify-between text-sm text-[#4a4545]">
      <span>&copy;2026 ACID-ish Sheets</span>
      <div className="flex items-center gap-6">
        <a href="https://acid-sheets.dev/privacy" className="hover:text-[#7f7a7a] transition-colors">
          Privacy
        </a>
        <a href="https://acid-sheets.dev/terms" className="hover:text-[#7f7a7a] transition-colors">
          Terms
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
        style={{ maxWidth: "1080px", borderColor: "#3d3838" }}
      >
        <Header />
        <HeroSection />
        <VideoSection />
        <FeaturesSection />
        <StatsSection />
        <PrivacySection />
        <FAQSection />
        <ZenSection />
        <NewsletterSection />
      </div>
      <div className="mx-auto" style={{ maxWidth: "1080px" }}>
        <Footer />
      </div>
    </main>
  );
}
