import type { Metadata, Viewport } from "next";
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

const SITE_URL = "https://pole-island.adidevpanday.com";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Pole Island Sky, the night sky from Alan Lightman's island in Maine",
  description:
    "A recreation of the wee-hours summer sky from Casco Bay, Maine, as described in Alan Lightman's Searching for Stars on an Island in Maine (2018).",
  keywords: [
    "Alan Lightman",
    "Searching for Stars on an Island in Maine",
    "Casco Bay",
    "night sky",
    "star chart",
    "planetarium",
    "astronomy",
  ],
  authors: [{ name: "Adi Panday", url: "https://adidevpanday.com" }],
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    siteName: "Pole Island Sky",
    url: SITE_URL,
    locale: "en_US",
    title: "Pole Island Sky, the night sky from Alan Lightman's island in Maine",
    description:
      "A recreation of the wee-hours summer sky from Casco Bay, Maine, as described in Alan Lightman's Searching for Stars on an Island in Maine (2018).",
  },
  twitter: {
    card: "summary_large_image",
    // creator: "" - add a handle here if/when one exists
    title: "Pole Island Sky, the night sky from Alan Lightman's island in Maine",
    description:
      "A recreation of the wee-hours summer sky from Casco Bay, Maine, as described in Alan Lightman's Searching for Stars on an Island in Maine (2018).",
  },
};

export const viewport: Viewport = {
  themeColor: "#02030a",
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
      </body>
    </html>
  );
}
