#!/usr/bin/env node

/**
 * Retired compatibility entrypoint.
 *
 * It deliberately never generates fixtures or self-grades simulated behavior.
 * Use `npm run verify:phase3` for the read-only focused regression runner.
 */

console.error(
  "This legacy simulator is retired because it could generate fixtures and self-grade simulated behavior. " +
  "Run `npm run verify:phase3` for the read-only focused regression runner."
);
process.exitCode = 2;
