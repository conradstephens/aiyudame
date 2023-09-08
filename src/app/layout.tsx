import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { Analytics } from "@vercel/analytics/react";
import { Toaster } from "@/components/ui/toaster";
import { JotaiProvider } from "@/components/jotai-provider";

const inter = Inter({ subsets: ["latin"] });

const APP_NAME = "AIyudame";
const APP_DESCRIPTION = "";

export const metadata: Metadata = {
  title: APP_NAME,
  description: APP_DESCRIPTION,
  manifest: "/manifest.json",
  viewport: "width=device-width, initial-scale=1",
  icons: ["/favicon.ico"],
  themeColor: "#ffffff",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html suppressHydrationWarning lang="en">
      <body suppressHydrationWarning className={inter.className}>
        <JotaiProvider>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            {children}
            <Toaster />
            <Analytics />
          </ThemeProvider>
        </JotaiProvider>
      </body>
    </html>
  );
}
