import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import type { ReactNode } from "react";

import { AlertCenter } from "@/components/layout/AlertCenter";
import { NavBar } from "@/components/layout/NavBar";
import { SimClock } from "@/components/layout/SimClock";
import { WelcomeOverlay } from "@/components/layout/WelcomeOverlay";
import { STARTING_CASH, STARTING_COMPUTE_HOURS } from "@/lib/economy";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "MCP Simulator — build things with fake money",
  description: `A no-signup simulator: start with $${STARTING_CASH} in play money and ${STARTING_COMPUTE_HOURS} free compute hours, buy model tokens and GPU time, then ship projects to earn more.`,
  applicationName: "MCP Simulator",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      {/* `suppressHydrationWarning` on <body> is deliberate, not cargo cult:
          browser extensions inject attributes here before React hydrates —
          ColorZilla adds `cz-shortcut-listen`, Grammarly and others do the
          same. Next.js also appends `data-new-gr-c-s-check-loaded` in that
          family. Suppressing the warning on this one element keeps a
          third-party extension from looking like an app bug. It only affects
          this node's attributes, not our own markup. */}
      <body
        className="relative flex min-h-full flex-col"
        suppressHydrationWarning
      >
        <SimClock />

        <div className="relative z-10 flex min-h-screen flex-col">
          <NavBar />
          <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 pb-20 pt-6 sm:px-6 lg:px-8">
            {children}
          </main>
          <footer className="mx-auto w-full max-w-[1440px] px-4 pb-8 sm:px-6 lg:px-8">
            <div className="flex flex-col items-start justify-between gap-2 border-t border-abyss-600/50 pt-5 text-xs text-fog-500 sm:flex-row sm:items-center">
              <p>
                MCP Simulator — every balance, token and GPU hour here is
                fictional. No accounts, no payments, no servers.
              </p>
              <p className="num text-fog-500">
                sim v1.1 · 52 models · 16 rigs · 34 contracts
              </p>
            </div>
          </footer>
        </div>

        <AlertCenter />
        <WelcomeOverlay />
      </body>
    </html>
  );
}
