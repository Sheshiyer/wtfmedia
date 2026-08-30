import "./globals.css";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { appUiVariant, themeForAppUiVariant } from "@/lib/public/public-ui-variant";
import { LegacyPublicShell } from "@/components/legacy/public/LegacyPublicShell";
import { PublicShell } from "@/components/patterns/PublicShell";
import { WtfOsBoot } from "@/components/patterns/brand/WtfOsBoot";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000"
  ),
  title: "wtf os · ask the catalogue, get the moment",
  description:
    "ask the WTF catalogue. answers come with sources. a timestamp only when the mapping is verified.",
  openGraph: {
    title: "wtf os",
    description:
      "ask the catalogue and get the moment. published and uncut stay distinct. built by spaceblanket.ai.",
    images: ["/brand/og-image.png"],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "wtf os",
    description:
      "ask the catalogue. sources beside the answer. timestamps only when verified.",
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
