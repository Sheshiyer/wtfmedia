import "./globals.css";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { appUiVariant, themeForAppUiVariant } from "@/lib/public/public-ui-variant";
import { LegacyPublicShell } from "@/components/legacy/public/LegacyPublicShell";
import { PublicShell } from "@/components/patterns/PublicShell";
import { WtfOsBoot } from "@/components/patterns/brand/WtfOsBoot";
import { AppearanceProvider } from "@/components/shells/AppearanceProvider";

const baseMetadata: Metadata = {
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

function requestMetadataBase(requestHeaders: Headers): URL | undefined {
  const configuredOrigin = process.env.WTFMEDIA_APP_ORIGIN?.trim();
  if (configuredOrigin) return new URL(configuredOrigin);

  // A Worker preview has no durable custom domain yet. Derive metadata from
  // the current request host so preview and custom-domain URLs stay truthful.
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  if (!host || !/^[a-z0-9.-]+(?::\d+)?$/i.test(host)) return undefined;
  const isLocalhost = host.startsWith("localhost") || host.startsWith("127.");
  const protocol = isLocalhost && requestHeaders.get("x-forwarded-proto") === "http" ? "http" : "https";
  return new URL(`${protocol}://${host}`);
}

export async function generateMetadata(): Promise<Metadata> {
  return { ...baseMetadata, metadataBase: requestMetadataBase(await headers()) };
}

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
        {variant === "wtfos" ? (
          <AppearanceProvider>
            {isOperatorRoute ? children : <><WtfOsBoot /><Shell>{children}</Shell></>}
          </AppearanceProvider>
        ) : isOperatorRoute ? children : <Shell>{children}</Shell>}
      </body>
    </html>
  );
}
