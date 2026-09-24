import type { Metadata } from "next";
import { Space_Grotesk, Outfit, Orbitron } from "next/font/google";
import "./globals.css";
// Thmanyah (ثمانية) Arabic font — official-recommended web package (CDN woff2 + @font-face).
import "@dawod/thmanyah-font-web/sans.css";

// English headings — distinctive, modern.
const display = Space_Grotesk({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

// English body — clean, friendly.
const body = Outfit({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

// Brand wordmark font (the "NyZk" logo/title) — techy, gaming feel.
const brand = Orbitron({
  variable: "--font-brand",
  subsets: ["latin"],
  weight: ["700", "800", "900"],
});


export const metadata: Metadata = {
  // Absolute base so share cards (og:image / twitter) resolve the image URL.
  metadataBase: new URL("https://nyzk.pages.dev"),
  title: "NyZk",
  description:
    "The official home of NyZk on Kick — live streams, clips, characters, and community stats.",
  openGraph: {
    title: "NyZk",
    description: "Live streams, clips, characters, and community stats.",
    type: "website",
    url: "https://nyzk.pages.dev",
  },
  twitter: {
    card: "summary_large_image",
    title: "NyZk",
    description: "Live streams, clips, characters, and community stats.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="ar"
      className={`${display.variable} ${body.variable} ${brand.variable} h-full antialiased`}
    >
      <body className="min-h-full">{children}</body>
    </html>
  );
}
