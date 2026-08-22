#!/usr/bin/env node

/**
 * Rollback verification script.
 *
 * Runs the appropriate rollback test for a given route.
 * Usage: node tests/rollback/verify.mjs --route=/episodes
 */

import { execSync } from "node:child_process";
import { parseArgs } from "node:util";

const { values } = parseArgs({
  options: {
    route: { type: "string" },
  },
});

const route = values.route;
if (!route) {
  console.error("Error: --route parameter is required");
  process.exit(1);
}

// Map routes to their rollback test files
const routeTestMap = {
  "/episodes": "tests/rollback/episodes-variant.spec.ts",
};

const testFile = routeTestMap[route];
if (!testFile) {
  console.error(`Error: No rollback test found for route ${route}`);
  process.exit(1);
}

try {
  console.log(`Running rollback test for ${route}...`);
  execSync(
    `npx playwright test ${testFile} --project=phase1-chromium --reporter=line`,
    { stdio: "inherit", cwd: process.cwd() }
  );
  console.log(`Rollback test passed for ${route}`);
} catch (error) {
  console.error(`Rollback test failed for ${route}`);
  process.exit(1);
}
