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
};
export default nextConfig;
