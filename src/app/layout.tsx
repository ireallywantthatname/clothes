import type { Metadata } from "next";
import { Geist, DM_Mono } from "next/font/google";
import { THEME_BOOT_SCRIPT } from "@/lib/theme";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const dmMono = DM_Mono({
  variable: "--font-dm-mono",
  subsets: ["latin"],
  weight: ["300", "400", "500"],
});

export const metadata: Metadata = {
  title: "clothes",
  description:
    "Upload pieces from your wardrobe, scroll to pair tops and bottoms, and save outfits that work.",
  openGraph: {
    title: "clothes",
    description: "Upload pieces from your wardrobe, scroll to pair tops and bottoms, and save outfits that work.",
    type: "website",
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
      data-theme="system"
      suppressHydrationWarning
      className={`${geistSans.variable} ${dmMono.variable} h-full antialiased`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-mono-0 text-mono-800 font-sans">
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
