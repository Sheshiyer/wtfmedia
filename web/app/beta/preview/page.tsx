import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { MemberBetaPreview } from "@/components/domain/beta/MemberBetaPreview";
import { isMemberBetaPreviewHost } from "@/lib/member-beta-preview";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function MemberBetaPreviewPage() {
  const host = (await headers()).get("host");
  if (!isMemberBetaPreviewHost(host)) notFound();
  return <MemberBetaPreview />;
}
