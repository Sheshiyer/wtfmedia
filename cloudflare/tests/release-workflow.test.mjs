import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

const cloudflareRoot = new URL("..", import.meta.url).pathname;
const projectRoot = join(cloudflareRoot, "..");
const releaseWorkflow = readFileSync(join(projectRoot, ".github", "workflows", "release.yml"), "utf8");
const packageVersions = [
  "package.json",
  "web/package.json",
  "cloudflare/package.json",
].map((path) => JSON.parse(readFileSync(join(projectRoot, path), "utf8")).version);

test("release workflow admits alpha and beta prerelease tags only", () => {
  const prereleaseTag = /^v[0-9]+\.[0-9]+\.[0-9]+-(?:alpha|beta)\.[0-9]+$/;
  for (const tag of ["v0.3.2-alpha.1", "v0.3.3-beta.2", "v12.34.56-beta.789"]) {
    assert.equal(prereleaseTag.test(tag), true, tag);
  }
  for (const tag of ["v0.3.3", "v0.3.3-rc.1", "v0.3.3-alpha", "v0.3.3-beta.1.2"]) {
    assert.equal(prereleaseTag.test(tag), false, tag);
  }
  assert.match(releaseWorkflow, /release_tag_pattern='\^v\[0-9\]\+\\\.\[0-9\]\+\\\.\[0-9\]\+-\(alpha\|beta\)\\\.\[0-9\]\+\$'/);
  assert.match(releaseWorkflow, /\[\[ ! "\$RELEASE_TAG" =~ \$release_tag_pattern \]\]/);
});

test("the next beta candidate has aligned manifests and preserves beta.2 as immutable history", () => {
  assert.deepEqual(packageVersions, ["0.3.3-beta.3", "0.3.3-beta.3", "0.3.3-beta.3"]);
  const betaTwoNotes = readFileSync(join(projectRoot, "docs", "releases", "v0.3.3-beta.2.md"), "utf8");
  assert.match(betaTwoNotes, /Historical prerelease record — not the current Beta\./);
  assert.match(betaTwoNotes, /not a Cloudflare deployment receipt/i);
  assert.match(betaTwoNotes, /Do not delete, move, reuse, or reinterpret/i);
});
