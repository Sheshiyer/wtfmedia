"use client";
// Only aliased by the isolated Phase 2 test server. Never used by app builds.
import type { ReactNode } from "react";
const getToken = async () => "phase2-fixture-token";
export function useAuth() {
  return { isLoaded: true, isSignedIn: true, userId: "phase2-fixture-user", sessionId: "phase2-fixture-session", getToken };
}
export function ClerkProvider({ children }: { children: ReactNode }) { return children; }
export function useUser() { return { isLoaded: true, user: { firstName: "Fixture", fullName: "Fixture User" } }; }
export function useClerk() { return { signOut: async () => {} }; }
export function SignIn() { return <div>Sign in fixture</div>; }
export function SignUp() { return <div>Sign up fixture</div>; }
