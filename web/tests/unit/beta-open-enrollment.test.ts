import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const authFrame = readFileSync(new URL("../../components/domain/ops/OperatorAuthFrame.tsx", import.meta.url), "utf8");
const betaPage = readFileSync(new URL("../../app/beta/page.tsx", import.meta.url), "utf8");
const betaLayout = readFileSync(new URL("../../app/beta/layout.tsx", import.meta.url), "utf8");
const memberUnavailable = readFileSync(new URL("../../components/domain/member/MemberBetaUnavailable.tsx", import.meta.url), "utf8");
const memberShell = readFileSync(new URL("../../components/domain/member/MemberBetaShell.tsx", import.meta.url), "utf8");
const memberWorkspace = readFileSync(new URL("../../components/domain/member/MemberChatWorkspace.tsx", import.meta.url), "utf8");
const memberGate = readFileSync(new URL("../../components/domain/member/MemberBetaGate.tsx", import.meta.url), "utf8");
const sessionNavigator = readFileSync(new URL("../../components/domain/member/MemberSessionNavigator.tsx", import.meta.url), "utf8");
const askComposer = readFileSync(new URL("../../components/domain/public/AskComposer.tsx", import.meta.url), "utf8");
const appRail = readFileSync(new URL("../../components/shells/AppRail.tsx", import.meta.url), "utf8");
const conversationThread = readFileSync(new URL("../../components/domain/public/ConversationThread.tsx", import.meta.url), "utf8");

describe("Beta open-enrollment copy", () => {
  it("permanently removes the temporary browser-only preview route", () => {
    expect(existsSync(new URL("../../app/beta/preview", import.meta.url))).toBe(false);
  });

  it("offers verified account creation without invitation-only language", () => {
    expect(authFrame).toContain('eyebrow: "company beta"');
    expect(authFrame).toContain("We create your private member account.");
    expect(memberWorkspace).toContain("company beta · private workspace");
    expect(memberWorkspace).not.toContain("Finish the emailed invitation");
  });

  it("keeps member entry on the Public Alpha composition instead of the dark operator frame", () => {
    expect(authFrame).toContain("data-member-auth-frame");
    expect(authFrame).toContain("<MigratedWordmarkMini plate />");
    expect(authFrame).toContain("wtf-question-lattice");
    expect(authFrame).toContain("return to public alpha");
  });

  it("puts the member gate in the shared route shell and keeps chat selection route-backed", () => {
    expect(betaLayout).toContain("<MemberBetaGate>");
    expect(betaPage).toContain("<MemberChatWorkspace");
    expect(betaPage).not.toContain('id="history"');
    expect(betaPage).not.toContain('id="memory"');
    expect(memberShell).toContain('mode="member"');
    expect(memberShell).toContain("memberBottomNavigation");
    expect(memberShell).not.toContain('/beta#history');
    expect(memberShell).not.toContain('/beta#memory');
  });

  it("extends the established Public Alpha WTF OS shell instead of replacing its visual system", () => {
    expect(memberShell).toContain("<AppShell");
    expect(memberShell).toContain('mode="member"');
    expect(memberWorkspace).toContain("bg-surface-raised");
    expect(memberWorkspace).toContain("font-display");
    expect(memberWorkspace).toContain("<ConversationEmptyState />");
    expect(memberWorkspace).toContain("<AskComposer");
    expect(memberWorkspace).toContain('variant="compact"');
    expect(askComposer).toContain('data-composer-variant="compact"');
    expect(askComposer).toContain('type="text"');
    expect(askComposer).toContain("rounded-full border-2 border-foreground");
    expect(memberWorkspace).not.toContain('aria-label="Your workspace"');
    expect(memberWorkspace).not.toContain("Source-backed answers");
    expect(memberWorkspace).not.toMatch(/#[0-9a-f]{3,8}/iu);
  });

  it("keeps member Beta in the Alpha chat frame instead of a two-button dock", () => {
    expect(appRail).toContain('mode === "member"');
    expect(appRail).toContain("shouldHideBottomDock");
    expect(appRail).toContain("hideBottomDock ? null");
    expect(appRail).toContain('href="/beta/settings"');
    expect(askComposer).toContain('placement?: "fixed" | "inline"');
    expect(askComposer).toContain('bottom-[calc(1rem+env(safe-area-inset-bottom))]');
    expect(conversationThread).toContain("ResizeObserver");
    expect(conversationThread).toContain('data-composer-placement={placement}');
    expect(conversationThread).toContain('composerPlacement?: "auto" | "fixed"');
    expect(conversationThread).toContain("data-fixed-composer");
  });

  it("keeps canonical Beta chat and Settings routes out of the bottom dock", () => {
    expect(appRail).toContain('pathname.startsWith("/beta/chat")');
    expect(appRail).toContain('pathname.startsWith("/beta/settings")');
  });

  it("keeps every admitted operator workspace destination in the primary navigation", () => {
    const gate = readFileSync(new URL("../../components/domain/beta/BetaPrincipalGate.tsx", import.meta.url), "utf8");
    expect(gate).toContain('navigation.filter((item) => item.section === "workspace")');
    expect(gate).not.toContain('href: "/beta/workspace/ingest"');
  });

  it("fails closed before mounting Clerk hooks when the publishable key is absent", () => {
    expect(betaLayout).not.toContain('"use client"');
    expect(betaLayout).toContain("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY");
    expect(betaLayout).toContain("<MemberBetaUnavailable />");
    expect(memberUnavailable).not.toContain("useAuth");
    expect(memberUnavailable).toContain("No conversation, history, or saved note has been shown.");
  });

  it("keeps member admission, recovered chat, and mobile session navigation bounded to the live route", () => {
    expect(memberGate).toContain("admissionGeneration");
    expect(memberGate).toContain("memberSessionIsAdmitted");
    expect(memberWorkspace).toContain("shouldApplyMemberResponse");
    expect(memberWorkspace).toContain("sourceModeForMemberQuestion");
    expect(memberWorkspace).toContain("resumeMessageId");
    expect(memberWorkspace).not.toContain("localStorage");
    expect(memberWorkspace).not.toContain("sessionStorage");
    expect(memberWorkspace).toContain("triggerRef={drawerTriggerRef}");
    expect(sessionNavigator).toContain("paginationError");
    expect(sessionNavigator).toContain("retry loading more");
    expect(sessionNavigator).toContain("refreshKey");
    expect(sessionNavigator).toContain("grid min-w-0 grid-cols-1");
    expect(sessionNavigator).toContain("line-clamp-2");
    expect(memberWorkspace).toContain("max-h-[calc(100dvh-27rem)]");
  });

  it("keeps answer and archive completion state in independent operation generations", () => {
    expect(memberWorkspace).toContain("submitEpoch");
    expect(memberWorkspace).toContain("archiveEpoch");
    expect(memberWorkspace).not.toContain("const requestEpoch");
  });

  it("invalidates an older conversation load when a submitted turn begins", () => {
    const submitSection = memberWorkspace.split("const submit =")[1]?.split("const archive =")[0] ?? "";
    expect(submitSection).toContain("loadEpoch.current += 1");
  });

  it("locks the shared pill composer input while an answer is pending", () => {
    const input = askComposer.split("<input")[1]?.split("/>")[0] ?? "";
    expect(input).toContain("disabled={disabled || loading}");
  });
});
