import type { Metadata } from "next";
import { Instrument_Serif, Inter_Tight, JetBrains_Mono, Manrope } from "next/font/google";
import localFont from "next/font/local";
import { Analytics } from "@vercel/analytics/next";
import { AttributionCapture } from "./_components/attribution-capture";
import "./globals.css";

const openRunde = localFont({
  variable: "--font-open-runde",
  src: [
    { path: "./fonts/OpenRunde-Regular.woff2", weight: "400", style: "normal" },
    { path: "./fonts/OpenRunde-Medium.woff2", weight: "500", style: "normal" },
    { path: "./fonts/OpenRunde-Semibold.woff2", weight: "600", style: "normal" },
    { path: "./fonts/OpenRunde-Bold.woff2", weight: "700", style: "normal" },
  ],
  display: "swap",
});

const interTight = Inter_Tight({
  variable: "--font-inter-tight",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-display",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
});

const SITE_TITLE = "CareSupport — Care coordination that lives in iMessage";
const SITE_DESCRIPTION =
  "Chat naturally. CareSupport turns family messages into a shared care system — tasks, meds, handoffs, summaries.";

export const metadata: Metadata = {
  metadataBase: new URL("https://caresupport.com"),
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: {
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    url: "/",
    siteName: "CareSupport",
    type: "website",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "CareSupport" }],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
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
      className={`${interTight.variable} ${jetbrainsMono.variable} ${manrope.variable} ${instrumentSerif.variable} ${openRunde.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <AttributionCapture />
        <Analytics />
      </body>
    </html>
  );
}
