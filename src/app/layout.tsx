import type { Metadata } from "next";
import { EB_Garamond, Space_Grotesk, Space_Mono } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";
import NavbarWrapper from "@/components/NavbarWrapper";
import { SITE_URL, SITE_NAME, SITE_TAGLINE, IS_INDEXABLE } from "@/lib/site";

const ebGaramond = EB_Garamond({
  subsets: ["latin"],
  variable: "--font-eb-garamond",
  weight: ["400", "500", "600", "700", "800"]
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  weight: ["300", "400", "500", "600", "700"]
});

const spaceMono = Space_Mono({
  subsets: ["latin"],
  variable: "--font-space-mono",
  weight: ["400", "700"]
});

export const metadata: Metadata = {
  // metadataBase makes every relative OG/canonical URL resolve absolutely.
  // Without it, share previews silently ship relative image paths that no
  // scraper can fetch.
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — ${SITE_TAGLINE}`,
    // Page titles read "Silver Lake Nights · Frequent Flyer".
    template: `%s · ${SITE_NAME}`,
  },
  description:
    "A curated map of what's happening in Los Angeles this week — shows, DJ nights, readings and the recurring nights worth becoming a regular at.",
  applicationName: SITE_NAME,
  keywords: [
    'things to do in Los Angeles',
    'LA events this week',
    'weekly events Los Angeles',
    'recurring nights LA',
    'live music Los Angeles',
  ],
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    locale: 'en_US',
    url: SITE_URL,
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description:
      "A curated map of what's happening in Los Angeles this week, plus the recurring nights worth becoming a regular at.",
  },
  twitter: { card: 'summary_large_image' },
  robots: IS_INDEXABLE
    ? { index: true, follow: true }
    : { index: false, follow: false },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${ebGaramond.variable} ${spaceGrotesk.variable} ${spaceMono.variable} font-sans`}>
        <Suspense fallback={<div style={{ height: '60px' }} />}>
          <NavbarWrapper />
        </Suspense>
        <main>{children}</main>
      </body>
    </html>
  );
}