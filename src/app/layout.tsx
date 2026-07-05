import type { Metadata } from "next";
import "./tailwind.css";
import "./globals.css";
import "../styles/globals-addendum.css";

export const metadata: Metadata = {
  title: "PlayMax Agency — Market Research, Brand Strategy & Media Activation",
  description:
    "PlayMax Agency delivers end-to-end market intelligence, brand strategy, and physical media activation for manufacturers, suppliers, and market entrants.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        {/* Google Fonts loaded via <link> — using external approach for reliability across the whole app */}
        {/* eslint-disable @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Space+Mono:wght@400;700&family=Inter:wght@300;400;500;600&display=swap"
          rel="stylesheet"
        />
        {/* eslint-enable @next/next/no-page-custom-font */}
      </head>
      <body className="min-h-full flex flex-col bg-black text-white font-body">
        {children}
      </body>
    </html>
  );
}
