import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// The catalogue has no ISR or tag-cache dependency today. Keep the first
// Cloudflare deployment stateless instead of creating a second R2 cache
// surface solely for framework defaults.
export default defineCloudflareConfig();
