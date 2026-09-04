/**
 * Deterministic local stand-in for the Cloudflare Worker `/v1/chat` endpoint.
 *
 * Used only by web/tests/contracts/api-chat.contract.test.ts to prove
 * web/app/api/chat/route.ts's existing behavior without calling any live
 * service. Selects a fixture response from a trigger string embedded in the
 * first line of the forwarded `question` field (`STUB_TRIGGER::<name>`).
 *
 * Never logs or stores full request bodies, header values, or secret
 * values — only bounded, non-sensitive per-request metadata for assertions.
 */

import http from "node:http";

export const DUMMY_SHARED_SECRET = "dummy-stub-shared-secret";

const TRIGGER_PREFIX = "STUB_TRIGGER::";

function groundedSources() {
  return [
    { n: 1, videoId: "RSB58m7Xwhg", title: "Public Episode One", score: 0.91, start: 125, timestamped: true, timestampStatus: "verified", timestampReason: null, url: "https://www.youtube.com/watch?v=RSB58m7Xwhg" },
    { n: 2, videoId: "QdWHGjReLUo", title: "Public Episode Two", score: 0.77, start: null, timestamped: false, timestampStatus: "source_timing_unavailable", timestampReason: "This published transcript was ingested without timestamp data; the link opens the full episode.", url: "https://www.youtube.com/watch?v=QdWHGjReLUo" },
  ];
}

function extractTrigger(question) {
  if (typeof question !== "string") return null;
  const firstLine = question.split("\n", 1)[0] ?? "";
  if (!firstLine.startsWith(TRIGGER_PREFIX)) return null;
  return firstLine.slice(TRIGGER_PREFIX.length).trim();
}

/**
 * Starts the stub on an ephemeral local port.
 * @param {{ sharedSecret?: string }} [options]
 */
export function startRagStub(options = {}) {
  const sharedSecret = options.sharedSecret ?? DUMMY_SHARED_SECRET;
  const requestLog = [];

  const server = http.createServer((req, res) => {
    if (req.method !== "POST" || req.url !== "/v1/chat") {
      res.writeHead(404, { "Content-Type": "application/json" }).end(JSON.stringify({ error: "not found" }));
      return;
    }

    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => {
      let parsed;
      try {
        parsed = JSON.parse(Buffer.concat(chunks).toString("utf8"));
      } catch {
        parsed = undefined;
      }
      const question = parsed && typeof parsed === "object" ? parsed.question : undefined;
      const sourceMode = parsed && typeof parsed === "object" ? parsed.sourceMode : undefined;
      const episodeId = parsed && typeof parsed === "object" ? parsed.episodeId : undefined;
      const trigger = extractTrigger(question);

      requestLog.push({
        hasSecretHeader: req.headers["x-edge-secret"] === sharedSecret,
        hasClientIpHeader: typeof req.headers["x-client-ip"] === "string",
        hasRequestIdHeader: typeof req.headers["x-request-id"] === "string",
        questionLength: typeof question === "string" ? question.length : 0,
        trigger: trigger ?? "(none)",
        sourceMode: sourceMode ?? "(none)",
        episodeId: episodeId ?? "(none)",
      });

      switch (trigger) {
        case "abort-connection": {
          req.socket.destroy();
          return;
        }
        case "status-500": {
          res.writeHead(500, { "Content-Type": "application/json" }).end(JSON.stringify({ error: "upstream failure" }));
          return;
        }
        case "malformed-json": {
          res.writeHead(200, { "Content-Type": "application/json" }).end("{not json");
          return;
        }
        case "missing-answer": {
          res.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify({ grounded: true, sources: groundedSources() }));
          return;
        }
        case "ungrounded": {
          res.writeHead(200, { "Content-Type": "application/json" }).end(
            JSON.stringify({ answer: "I don't have grounded evidence for that in the public corpus.", grounded: false, sources: [] })
          );
          return;
        }
        case "sources-not-array": {
          res.writeHead(200, { "Content-Type": "application/json" }).end(
            JSON.stringify({ answer: "Grounded answer text.", grounded: true, sources: null })
          );
          return;
        }
        case "uncut-frame-io": {
          res.writeHead(200, { "Content-Type": "application/json" }).end(
            JSON.stringify({
              answer: "Uncut grounded answer [1].",
              grounded: true,
              sources: [{
                n: 1,
                videoId: "O7O204wD82s",
                title: "Vinod Khosla",
                score: 0.92,
                start: 451,
                timestamped: true,
                sourceMode: "uncut",
                url: "https://f.io/0I8LmYs9",
              }],
            }),
          );
          return;
        }
        case "mode-fallback": {
          res.writeHead(200, { "Content-Type": "application/json" }).end(
            JSON.stringify({
              answer: "Published fallback answer [1].",
              grounded: true,
              requestedSourceMode: sourceMode,
              evidenceSourceMode: "published",
              sourceMode: "published",
              fallbackReason: "requested_mode_not_competitive",
              uncutUnavailable: true,
              citedIndices: [1],
              sources: groundedSources().slice(0, 1),
            }),
          );
          return;
        }
        case "mode-insufficient": {
          res.writeHead(200, { "Content-Type": "application/json" }).end(
            JSON.stringify({
              answer: "No sufficient requested evidence.",
              grounded: false,
              requestedSourceMode: sourceMode,
              evidenceSourceMode: null,
              sourceMode,
              fallbackReason: "requested_mode_insufficient",
              uncutUnavailable: true,
              citedIndices: [],
              sources: [],
            }),
          );
          return;
        }
        case "invalid-source-metadata": {
          res.writeHead(200, { "Content-Type": "application/json" }).end(
            JSON.stringify({
              answer: "Grounded answer text.",
              grounded: true,
              requestedSourceMode: "private",
              evidenceSourceMode: "private",
              sourceMode: "private",
              fallbackReason: "private_reason",
              uncutUnavailable: false,
              responseState: "private_state",
              citedIndices: [1],
              sources: [{ ...groundedSources()[0], mappingStatus: "private_status" }],
            }),
          );
          return;
        }
        default: {
          res.writeHead(200, { "Content-Type": "application/json" }).end(
            JSON.stringify({ answer: "Grounded answer text.", grounded: true, sources: groundedSources() })
          );
        }
      }
    });
  });

  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      resolve({
        url: `http://127.0.0.1:${port}`,
        sharedSecret,
        requestLog,
        close: () => new Promise((closeResolve) => server.close(() => closeResolve())),
      });
    });
  });
}

export function triggerQuestion(trigger, body = "content") {
  return `${TRIGGER_PREFIX}${trigger}\n${body}`;
}
