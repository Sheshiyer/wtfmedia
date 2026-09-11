"use client";

// Compatibility export for member chat components. Admission is owned by the
// single principal gate in app/beta/layout.tsx.
// The former admissionGeneration/memberSessionIsAdmitted implementation is
// intentionally replaced by the server-verified principal-context request.
export { BetaPrincipalGate as MemberBetaGate, useMemberFetch } from "@/components/domain/beta/BetaPrincipalGate";
