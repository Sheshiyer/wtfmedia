/**
 * Narrow, versioned binding contract for source type-checking.
 * `npm run cf:typegen` may additionally produce ignored runtime typings.
 */
interface CloudflareServiceBinding {
  fetch(input: Request | URL | string, init?: RequestInit): Promise<Response>;
}

interface CloudflareEnv {
  WTFMEDIA_EDGE?: CloudflareServiceBinding;
}
