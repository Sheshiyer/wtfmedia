#!/usr/bin/env node
/**
 * Ask WTF retrieval eval harness.
 *
 * Usage:
 *   node eval/run-eval.mjs <label> [edgeUrl]
 *
 * Reads EDGE_SHARED_SECRET from cloudflare/.dev.vars, posts each question in
 * eval/questions.json to the edge /v1/chat endpoint, and writes
 * eval/results/<label>.json plus a console table.
 *
 * Labels matter: use "baseline" before a change and "after-<change>" after,
 * so results can be diffed side by side.
 */
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const label = process.argv[2] ?? "run";
const edgeUrl = process.argv[3] ?? "http://localhost:8787/v1/chat";

const secret = readFileSync(join(here, "..", ".dev.vars"), "utf8")
  .split("\n")
  .find((line) => line.startsWith("EDGE_SHARED_SECRET="))
  ?.split("=")[1]
  ?.trim();
if (!secret) {
  console.error("EDGE_SHARED_SECRET not found in cloudflare/.dev.vars");
  process.exit(1);
}

const questions = JSON.parse(readFileSync(join(here, "questions.json"), "utf8"));

const EXCERPT_DUMP = "synthesis model did not return valid citations";
const GUARD_MARKER = "verify catalogue-wide counts";
const ABSTAIN_MARKERS = [
  "don’t have enough relevant evidence",
  "don't have enough relevant evidence",
  "not enough published",
  "not enough relevant evidence",
];

function classify(expect, result) {
  const answer = result.answer ?? "";
  if (result.error) return "error";
  if (answer.includes(GUARD_MARKER)) return "guard/canned";
  if (answer.includes(EXCERPT_DUMP)) return "excerpt-dump";
  if (ABSTAIN_MARKERS.some((m) => answer.includes(m))) return "abstain";
  return "answer";
}

function passFail(expect, kind, result) {
  const citationsValid = !kind.includes("excerpt-dump");
  if (expect === "guard") return kind === "guard/canned" ? "PASS" : "FAIL";
  if (expect === "abstain") return kind === "abstain" ? "PASS" : "FAIL";
  // expect === "answer"
  if (kind !== "answer") return "FAIL";
  if (!citationsValid) return "FAIL";
  return "PASS";
}

const results = [];
for (const q of questions) {
  const started = Date.now();
  let body;
  try {
    const res = await fetch(edgeUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Edge-Secret": secret },
      body: JSON.stringify({ question: q.question, sourceMode: "published" }),
      signal: AbortSignal.timeout(90_000),
    });
    body = await res.json();
  } catch (error) {
    body = { error: error instanceof Error ? error.message : "fetch failed" };
  }
  const latencyMs = Date.now() - started;
  const kind = classify(q.expect, body);
  const verdict = passFail(q.expect, kind, body);
  const titleHit = q.titleContains
    ? (body.sources ?? []).some((s) => s.title?.includes(q.titleContains))
    : null;
  results.push({
    id: q.id,
    question: q.question,
    expect: q.expect,
    kind,
    verdict,
    titleHit,
    grounded: body.grounded ?? null,
    modelFallback: body.modelFallback ?? null,
    model: body.model ?? null,
    sourceCount: body.sources?.length ?? 0,
    topScore: body.sources?.[0]?.score ?? null,
    latencyMs,
    answer: body.answer ?? body.error ?? "",
  });
  console.log(
    `${verdict === "PASS" ? "✅" : "❌"} ${q.id.padEnd(18)} ${kind.padEnd(14)} sources=${String(body.sources?.length ?? 0).padEnd(2)} top=${body.sources?.[0]?.score ?? "-"} ${latencyMs}ms${titleHit === false ? "  (expected episode missing)" : ""}`,
  );
}

const passed = results.filter((r) => r.verdict === "PASS").length;
console.log(`\n${passed}/${results.length} passed`);

mkdirSync(join(here, "results"), { recursive: true });
const out = join(here, "results", `${label}.json`);
writeFileSync(out, JSON.stringify({ label, edgeUrl, ranAt: new Date().toISOString(), results }, null, 2));
console.log(`wrote ${out}`);
