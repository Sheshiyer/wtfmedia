import "./globals.css";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { appUiVariant } from "@/lib/public/public-ui-variant";
import { LegacyPublicShell } from "@/components/legacy/public/LegacyPublicShell";
import { PublicShell } from "@/components/patterns/PublicShell";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000"
  ),
  title: "wtfmedia · the catalogue, with a memory",
  description:
    "The internal media workspace for the WTF catalogue. Ask anything across 55 conversations and get answers in the guest's own words, cited to the second.",
  openGraph: {
    title: "wtfmedia · the catalogue, with a memory",
    description:
      "Ask the WTF catalogue anything. Cited, timestamped answers across 55 episodes. Built by spaceblanket.ai.",
    images: ["/brand/og-image.png"],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "wtfmedia",
    description:
      "Ask the WTF catalogue anything. Cited, timestamped. Built by spaceblanket.ai.",
    images: ["/brand/og-image.png"],
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const variant = appUiVariant();
  const Shell = variant === "wtfos" ? PublicShell : LegacyPublicShell;
  const requestHeaders = await headers();
  const routeKind = requestHeaders.get("x-wtf-route-kind");
  const isOperatorRoute = routeKind === "ops" || routeKind === "ops-recovery";

  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col overflow-x-hidden">
        {isOperatorRoute ? children : <Shell>{children}</Shell>}
      </body>
    </html>
  );
}
