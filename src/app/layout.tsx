import type { Metadata } from "next";
import { EB_Garamond } from "next/font/google";
// 1. Import Suspense
import { Suspense } from "react";
import "./globals.css";
import Navbar from "@/features/frequent-flyer/components/Navbar";

const ebGaramond = EB_Garamond({
  subsets: ["latin"],
  variable: "--font-eb-garamond",
  weight: ["400", "500", "600", "700", "800"]
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
      <body className={ebGaramond.variable}>
        {/* 2. Wrap Navbar in Suspense */}
        <Suspense fallback={<div style={{ height: '60px' }} />}>
          <Navbar />
        </Suspense>
        <main>{children}</main>
      </body>
    </html>
  );
}