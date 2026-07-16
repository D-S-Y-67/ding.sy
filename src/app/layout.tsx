import type { Metadata, Viewport } from "next";
import { Instrument_Sans, Marcellus, Roboto } from "next/font/google";
import "./globals.css";

const sans = Instrument_Sans({
  variable: "--font-sans-src",
  subsets: ["latin"],
});

// Display face for the wordmark only — an inscriptional Roman face; the name
// means "carved" (glyptos), and the letterforms carry that.
const display = Marcellus({
  weight: "400",
  variable: "--font-display-src",
  subsets: ["latin"],
});

// Loaded solely for the Google sign-in button, whose branding guidelines
// specify Roboto Medium.
const roboto = Roboto({
  weight: "500",
  variable: "--font-roboto-src",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Sign in · Regmaglypt",
  description:
    "Sign in to Regmaglypt — with Google or a magic link sent to your email.",
};

export const viewport: Viewport = {
  themeColor: "#04050c",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${sans.variable} ${display.variable} ${roboto.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col font-sans">{children}</body>
    </html>
  );
}
