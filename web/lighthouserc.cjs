/**
 * Lighthouse CI configuration for Phase 1 proof harness.
 * Filesystem only. Five runs per protected public UI route.
 * No numeric assertions yet — budgets are recorded in a later wave.
 */
module.exports = {
  ci: {
    collect: {
      url: [
        "http://localhost:4173/",
        "http://localhost:4173/episodes",
        "http://localhost:4173/connections",
        "http://localhost:4173/chat",
      ],
      numberOfRuns: 5,
      startServerCommand: "npm run build && npm run start",
      startServerReadyPattern: "Ready in",
      startServerReadyTimeout: 120000,
    },
    upload: {
      target: "filesystem",
      outputDir: "lighthouse-reports",
    },
    assert: {},
  },
};
