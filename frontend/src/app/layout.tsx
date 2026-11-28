import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import "./globals.css";
import "./themes.css";
import { Providers } from "@/components/providers";

// Mono face for times, durations and figures (self-hosted by next/font).
const monoFace = JetBrains_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-mono-face", display: "swap" });

export const metadata: Metadata = {
  title: {
    template: "%s",
    default: "Inter Smart",
  },
  description: "Inter Smart Employee Management Portal",
  manifest: "/manifest.json",
  icons: {
    icon: "/icon.png",
    shortcut: "/icon.png",
    apple: "/icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "InterSmart",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`h-full antialiased light ${monoFace.variable}`} suppressHydrationWarning>
      <head>
        <meta name="color-scheme" content="light only" />
        <script dangerouslySetInnerHTML={{ __html: `document.documentElement.classList.remove('dark'); document.documentElement.classList.add('light'); document.documentElement.style.colorScheme = 'light';` }} />
      </head>
      <body className="min-h-full flex flex-col font-sans" style={{ backgroundColor: '#F8FAFC', color: '#0f172a' }}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
