import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";

export const metadata: Metadata = {
  title: "Inter Smart Portal",
  description: "Inter Smart Employee Management Portal",
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased light" suppressHydrationWarning>
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
