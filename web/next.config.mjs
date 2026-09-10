/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "img.youtube.com" },
      { protocol: "https", hostname: "i.ytimg.com" },
    ],
  },
  // Ensure the prebuilt vector store is traced into the /api/chat serverless function
  outputFileTracingIncludes: {
    "/api/chat": ["./src/data/vectors.json"],
  },
  async rewrites() {
    return [
      // Keep the canonical browser URL in the Beta lane while reusing the
      // audited operator pages and their server-side policy checks.
      { source: "/beta/ops", destination: "/ops" },
      { source: "/beta/ops/:path*", destination: "/ops/:path*" },
    ];
  },
};
export default nextConfig;
