import type { Metadata } from "next";
import { EB_Garamond, Space_Grotesk, Space_Mono } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";
import Navbar from "@/features/frequent-flyer/components/Navbar";

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
  title: "Frequent Flyer",
  description: "Local events search and vibe check.",
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
          <Navbar />
        </Suspense>
        <main>{children}</main>
      </body>
    </html>
  );
}