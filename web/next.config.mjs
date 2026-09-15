/** @type {import('next').NextConfig} */
const nextConfig = {  images: {
    remotePatterns: [
      { protocol: "https", hostname: "img.youtube.com" },
      { protocol: "https", hostname: "i.ytimg.com" },
    ],
  },
  // Baseline hardening on every page response. (No CSP here yet — Clerk's
  // script requirements need a nonce-based policy, tracked separately.)
  headers: async () => [
    {
      source: "/:path*",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      ],
    },
  ],
  // Ensure the prebuilt vector store is traced into the /api/chat serverless function
  outputFileTracingIncludes: {
    "/api/chat": ["./src/data/vectors.json"],
  },
};
export default nextConfig;

// Local dev: expose the wrangler.jsonc bindings (incl. the WTFMEDIA_EDGE
// service binding to the local edge worker) to `next dev` route handlers.
if (process.env.NODE_ENV === "development") {
  const { initOpenNextCloudflareForDev } = await import("@opennextjs/cloudflare");
  initOpenNextCloudflareForDev();
}
