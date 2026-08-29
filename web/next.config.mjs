import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

// Keeps `next dev` aligned with the Worker bindings available in the
// production OpenNext runtime. The promise is intentionally not awaited;
// OpenNext initializes its local platform proxy in the background.
initOpenNextCloudflareForDev();

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "img.youtube.com" },
      { protocol: "https", hostname: "i.ytimg.com" },
    ],
  },
};
export default nextConfig;
