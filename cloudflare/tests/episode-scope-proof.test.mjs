import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

import {
  buildVectorQueryOptions,
  resolveEpisodeScopedSources,
} from "../src/chat/source-mode.ts";

const fixturePath = fileURLToPath(new URL("./fixtures/episode-scope-proof.json", import.meta.url));

async function loadFixture() {
  return JSON.parse(await readFile(fixturePath, "utf8"));
}

test("episode-scoped retrieval keeps source identity and excludes unrelated matches", async () => {
  const fixture = await loadFixture();
  const { episodeId, matches, expected } = fixture;

  assert.deepEqual(buildVectorQueryOptions(episodeId).filter, {
    video_id: { $eq: episodeId },
  });

  for (const [mode, expectedSegments] of Object.entries(expected)) {
    const resolved = resolveEpisodeScopedSources(matches, mode, episodeId, 0.45, 6);
    assert.deepEqual(
      resolved.citations.map((citation) => citation.segmentId),
      expectedSegments,
      `${mode} segment projection`,
    );
    assert.equal(
      resolved.citations.every((citation) => citation.videoId === episodeId),
      true,
      `${mode} scope must not broaden beyond the selected episode`,
    );
  }
});

test("episode-scoped both mode reports missing uncut without global published fallback", async () => {
  const fixture = await loadFixture();
  const matches = fixture.matches.filter((match) => match.metadata.source_mode !== "uncut");
  const resolved = resolveEpisodeScopedSources(matches, "both", fixture.episodeId, 0.45, 6);

  assert.equal(resolved.uncutUnavailable, true);
  assert.deepEqual(resolved.citations.map((citation) => citation.segmentId), ["published-target"]);
  assert.equal(resolved.citations[0].videoId, fixture.episodeId);
  assert.equal(resolved.citations[0].sourceMode, "published");
});

test("episode-scoped citations preserve published YouTube and uncut asset locators", async () => {
  const fixture = await loadFixture();
  const resolved = resolveEpisodeScopedSources(fixture.matches, "both", fixture.episodeId, 0.45, 6);
  const uncut = resolved.citations.find((citation) => citation.sourceMode === "uncut");
  const published = resolved.citations.find((citation) => citation.sourceMode === "published");

  assert.ok(uncut);
  assert.ok(published);
  assert.match(uncut.url, /^uncut:/);
  assert.equal(uncut.url.includes("youtube.com"), false);
  assert.match(published.url, /^https:\/\/www\.youtube\.com\/watch\?/);
  assert.equal(published.timestamped, true);
  assert.equal(uncut.timestamped, true);
});
