import { MemberBetaGate } from "@/components/domain/member/MemberBetaGate";
import { MemberBetaUnavailable } from "@/components/domain/member/MemberBetaUnavailable";

export default function MemberBetaLayout({ children }: { children: React.ReactNode }) {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim()) return <MemberBetaUnavailable />;
  return <MemberBetaGate>{children}</MemberBetaGate>;
}
