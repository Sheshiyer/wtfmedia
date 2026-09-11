"use client";
import { ReleaseControl } from "@/app/(operator)/ops/settings/ReleaseControl";
import { BetaSettingsNavigation } from "@/components/domain/beta/BetaSettingsNavigation";
export default function Page() { return <div className="mx-auto grid max-w-[var(--wtf-content-max)] gap-6 px-4 py-6 sm:px-8 lg:grid-cols-[15rem_minmax(0,1fr)] xl:px-12"><BetaSettingsNavigation /><ReleaseControl /></div>; }
