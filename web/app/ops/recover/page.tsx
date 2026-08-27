import { AccessRecovery, type RecoveryMode } from "@/components/domain/ops/AccessRecovery";
import { validatedReturnTo } from "@/lib/ops/return-to";

function clearProtectedStateScript() {
  return {
    __html:
      "for(const store of [localStorage,sessionStorage]){for(let i=store.length-1;i>=0;i--){const key=store.key(i);if(key&&key.startsWith('wtf-ops:'))store.removeItem(key)}}",
  };
}

export default async function OpsRecoveryPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string; returnTo?: string }>;
}) {
  const params = await searchParams;
  const mode: RecoveryMode =
    params.mode === "unavailable" ||
    params.mode === "verification-unavailable" ||
    params.mode === "signing-out"
      ? params.mode
      : "reauthenticate";
  const returnTo = validatedReturnTo(params.returnTo);

  return (
    <>
      <script dangerouslySetInnerHTML={clearProtectedStateScript()} />
      <AccessRecovery mode={mode} returnTo={returnTo} />
    </>
  );
}
