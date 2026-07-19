import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
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
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "https://loopthing.ai",
  ),
  title: {
    default: "Loopthing — Great work is developed",
    template: "%s · Loopthing",
  },
  description:
    "Drop unfinished thinking by day. Loopthing dreams on it overnight and returns a rewritten document, an honest critique, and new questions.",
  openGraph: {
    title: "Great work isn't generated. It's developed.",
    description:
      "Drop unfinished thinking by day. Wake up to a rewritten document, an honest critique, and new questions.",
    url: "/",
    siteName: "Loopthing",
    type: "website",
    images: [{ url: "/og.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Great work isn't generated. It's developed.",
    description:
      "Drop unfinished thinking by day. Wake up to a rewritten document, an honest critique, and new questions.",
    images: ["/og.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <TooltipProvider>{children}</TooltipProvider>
        <Toaster richColors />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
