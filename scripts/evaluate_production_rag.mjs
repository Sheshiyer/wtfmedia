#!/usr/bin/env node
const target = process.env.RAG_EVAL_URL || "https://wtfmedia.vercel.app/api/chat";
const cases = [
  {
    name: "grounded_answer_has_citation_and_source",
    question: "What does Nikos Christodoulides say India should lead?",
    assert: ({ status, text, sources }) => status === 200 && /\[1\]/.test(text) && sources.some((source) => source.video_id === "RSB58m7Xwhg"),
  },
  {
    name: "ownership_claim_abstains",
    question: "Does Tanmay Bhat own the WTF podcast?",
    assert: ({ status, text, sources }) => status === 200 && /can.t verify|won.t infer|official/i.test(text) && sources.length === 0,
  },
  {
    name: "timestamped_source_is_honest",
    question: "What does Rishi Sunak say about patience and ambition?",
    assert: ({ status, sources }) => status === 200 && sources.every((source) => source.t == null || Number.isFinite(source.t)),
  },
];

const results = [];
for (const test of cases) {
  const response = await fetch(target, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ messages: [{ role: "user", content: test.question }] }) });
  const text = await response.text();
  let sources = [];
  try { sources = JSON.parse(decodeURIComponent(response.headers.get("x-sources") || "[]")); } catch {}
  const result = { name: test.name, status: response.status, pass: test.assert({ status: response.status, text, sources }), sources: sources.length };
  results.push(result);
}
console.log(JSON.stringify({ target, pass: results.every((result) => result.pass), results }, null, 2));
if (results.some((result) => !result.pass)) process.exit(1);
