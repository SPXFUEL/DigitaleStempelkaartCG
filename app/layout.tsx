import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import SWRegister from "./components/SWRegister";
import Plausible from "./components/Plausible";
import PrivacyFooter from "./components/PrivacyFooter";
import { config } from "@/lib/config";
import { BRAND_NAME } from "@/lib/constants";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SITE_TITLE = `${BRAND_NAME} — Stempelkaart`;
const SITE_DESCRIPTION =
  "Spaar voor een gratis drankje bij Coffee Garden. Geen app-installatie nodig.";

export const metadata: Metadata = {
  metadataBase: new URL(config.baseUrl),
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Coffee Garden",
  },
  openGraph: {
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    url: config.baseUrl,
    siteName: BRAND_NAME,
    locale: "nl_NL",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: `${BRAND_NAME} digitale stempelkaart`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: ["/og-image.png"],
  },
  icons: {
    icon: [
      { url: "/icons/logo-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/logo-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/icons/logo-apple.png",
  },
  robots: {
    // Loyalty-app heeft geen waarde voor zoekmachines; voorkom dat een
    // toevallige indexing /staff of /profiel oppikt.
    index: false,
    follow: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#5b3a1f",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="nl"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <Plausible />
      </head>
      <body className="min-h-full flex flex-col">
        {children}
        <PrivacyFooter />
        <SWRegister />
      </body>
    </html>
  );
}
