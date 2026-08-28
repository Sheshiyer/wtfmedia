import { AccessRecovery } from "@/components/domain/ops/AccessRecovery";

export default function RequestAccessPage() {
  return <AccessRecovery mode="request-access" returnTo="/ops" />;
}
