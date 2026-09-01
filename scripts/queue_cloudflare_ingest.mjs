#!/usr/bin/env node
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { resolveEnqueueUrl } from "./put-uncut-and-enqueue.mjs";

const token = process.env.INGEST_SECRET;
if (!token) throw new Error("INGEST_SECRET is required");
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const episodes = JSON.parse(readFileSync(join(root, "web/src/data/episodes.json"), "utf8")).entries;
const jobs = episodes.map((episode) => {
  const transcript = readFileSync(join(root, "web/public/transcripts", `${episode.video_id}.txt`));
  const timestampPath = join(root, "web/public/transcripts", `${episode.video_id}.json`);
  const contentHash = createHash("sha256").update(transcript);
  const timestampsKey = existsSync(timestampPath) ? `timestamps/${episode.video_id}.json` : undefined;
  if (timestampsKey) contentHash.update(readFileSync(timestampPath));
  return { videoId: episode.video_id, title: episode.title, transcriptKey: `transcripts/${episode.video_id}.txt`, timestampsKey, contentHash: contentHash.digest("hex"), sourceMode: "published" };
});
const response = await fetch(resolveEnqueueUrl(), {
  method: "POST",
  headers: { "content-type": "application/json", "x-ingest-token": token },
  body: JSON.stringify({ jobs }),
});
if (!response.ok) throw new Error(`enqueue failed: ${response.status}`);
console.log(JSON.stringify(await response.json()));
