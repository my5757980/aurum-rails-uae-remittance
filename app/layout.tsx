import type { Metadata, Viewport } from "next";
import { TestnetBanner } from "@/components/TestnetBanner";
import "./globals.css";

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),
  title: "Aurum Rails — Send money home from the UAE",
  description:
    "Transparent cross-border payments from the UAE, settled in seconds on Arc. See every fee before you send.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0b1220",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-dvh bg-slate-950 font-sans text-slate-100 antialiased">
        <TestnetBanner />
        {children}
      </body>
    </html>
  );
}
