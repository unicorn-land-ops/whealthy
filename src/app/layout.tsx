import type { Metadata } from "next";
import Script from "next/script";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "whealthy · Wealth Longevity Planner",
  description:
    "Client-side lifetime wealth simulator with configurable spending rules, taxes, philanthropy, and Monte Carlo analysis.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        {/* @ts-expect-error Web Component */}
        <unicorn-footer />
        <Script src="https://unicorn-land.pages.dev/components/footer.js" strategy="lazyOnload" />
      </body>
    </html>
  );
}
