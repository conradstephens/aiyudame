import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ThemeProvider } from "@/providers/theme-provider";
import { Analytics } from "@vercel/analytics/react";
import { Toaster } from "@/components/ui/toaster";
import { JotaiProvider } from "@/providers/jotai-provider";
import Reroute from "@/components/reroute";

const inter = Inter({ subsets: ["latin"] });

const APP_NAME = "AIyudame";
const APP_DESCRIPTION = "";

export const metadata: Metadata = {
  title: APP_NAME,
  description: APP_DESCRIPTION,
  manifest: "/manifest.json",
  viewport: {
    width: "device-width",
    initialScale: 1,
  },
  icons: ["/favicon.ico"],
  themeColor: "#ffffff",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html suppressHydrationWarning lang="en" className={inter.className}>
      <body suppressHydrationWarning>
        <JotaiProvider>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            <Reroute>
              {children}
              <Toaster />
              <Analytics />
            </Reroute>
          </ThemeProvider>
        </JotaiProvider>
      </body>
    </html>
  );
}
