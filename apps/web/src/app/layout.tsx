import type { Metadata } from "next";
import { IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: "ACID-ish Sheets | Google Sheets that behaves like a real database",
  description:
    "Race-condition-safe writes, typed SDKs, no polling. The Sheets backend your designer can set up and your CTO can trust.",
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
