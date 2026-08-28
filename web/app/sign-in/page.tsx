import { AccessRecovery } from "@/components/domain/ops/AccessRecovery";

export default function SignInPage() {
  return <AccessRecovery mode="reauthenticate" returnTo="/ops" />;
}
