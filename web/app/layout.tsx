import "./globals.css";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { appUiVariant, themeForAppUiVariant } from "@/lib/public/public-ui-variant";
import { LegacyPublicShell } from "@/components/legacy/public/LegacyPublicShell";
import { PublicShell } from "@/components/patterns/PublicShell";
import { WtfOsBoot } from "@/components/patterns/brand/WtfOsBoot";

export const metadata: Metadata = {
  // Set only once the approved Cloudflare custom origin exists. Keeping this
  // unset for workers.dev previews prevents Vercel metadata from leaking into
  // the Cloudflare-native deployment.
  metadataBase: process.env.WTFMEDIA_APP_ORIGIN
    ? new URL(process.env.WTFMEDIA_APP_ORIGIN)
    : undefined,
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
    <html
      lang="en"
      data-wtf-ui={variant === "wtfos" ? "wtfos" : undefined}
      data-wtf-theme={themeForAppUiVariant(variant)}
    >
      <body className="min-h-screen flex flex-col overflow-x-hidden">
        {isOperatorRoute ? (
          children
        ) : (
          <>
            {variant === "wtfos" && <WtfOsBoot />}
            <Shell>{children}</Shell>
          </>
        )}
      </body>
    </html>
  );
}
