import { MemberBetaGate } from "@/components/domain/member/MemberBetaGate";
import { MemberBetaUnavailable } from "@/components/domain/member/MemberBetaUnavailable";

export default function MemberBetaLayout({ children }: { children: React.ReactNode }) {
  // Keep Clerk hooks behind this server-side configuration guard.
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim()) return <MemberBetaUnavailable />;
  return <MemberBetaGate>{children}</MemberBetaGate>;
}
