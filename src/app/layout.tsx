import type { Metadata } from "next";
import { Outfit, Plus_Jakarta_Sans } from "next/font/google";

import { SiteFooter } from "@/components/site-footer";

import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["700", "800"],
});

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: "Tiny Confetti",
  description: "Bright, safe toys for little hands.",
};

// Never reads the session (architecture.md Server/client boundary): each page renders
// its own header and <main>.
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${outfit.variable} ${jakarta.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
