export const BOOT_STORAGE_KEY = "wtf-os-boot-seen";
export const BOOT_MS = 1400;

export type WtfOsBootMode = "hidden" | "motion" | "still";

export function resolveWtfOsBoot(input: {
  webdriver: boolean;
  reducedMotion: boolean;
  seen: boolean;
  force: boolean;
}): WtfOsBootMode {
  if (input.webdriver && !input.force) return "hidden";
  if (input.seen && !input.force) return "hidden";
  return input.reducedMotion ? "still" : "motion";
}

export function bootForceFromSearch(search: string): boolean {
  return new URLSearchParams(search.startsWith("?") ? search.slice(1) : search).get("boot") === "1";
}
