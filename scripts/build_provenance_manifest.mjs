#!/usr/bin/env node
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const episodes = JSON.parse(readFileSync(join(root, "web/src/data/episodes.json"), "utf8")).entries;
const builtAt = new Date().toISOString();
const entries = episodes.map((episode) => {
  const transcript = join(root, "web/public/transcripts", `${episode.video_id}.txt`);
  const timestamps = join(root, "web/public/transcripts", `${episode.video_id}.json`);
  const bytes = readFileSync(transcript);
  return {
    video_id: episode.video_id,
    title: episode.title,
    source_url: episode.url,
    transcript: {
      key: `transcripts/${episode.video_id}.txt`,
      sha256: createHash("sha256").update(bytes).digest("hex"),
      bytes: bytes.length,
    },
    timestamps: existsSync(timestamps)
      ? { key: `timestamps/${episode.video_id}.json`, available: true }
      : { available: false },
    embedding: { model: "@cf/baai/bge-large-en-v1.5", dimensions: 1024 },
  };
});
const manifest = {
  schema_version: 1,
  generated_at: builtAt,
  corpus: { episodes: entries.length, timestamped_episodes: entries.filter((entry) => entry.timestamps.available).length },
  entries,
};
writeFileSync(join(root, "web/src/data/corpus-manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify(manifest.corpus));
