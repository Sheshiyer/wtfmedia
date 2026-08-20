import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPOSITORY_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const MANIFEST_PATH = path.join(
  REPOSITORY_ROOT,
  "web/tests/contracts/phase1-compatibility-manifest.json",
);
const TASK_PATHS = [
  "web/scripts/capture-phase1-baseline.mjs",
  "web/scripts/run-phase1-threat.mjs",
  "web/tests/contracts/phase1-compatibility-manifest.json",
  "web/tests/security/phase1-threat-results/01-01.json",
];
const PROTECTED_FILES = [
  "web/app/layout.tsx",
  "web/app/page.tsx",
  "web/app/episodes/page.tsx",
  "web/app/connections/page.tsx",
  "web/app/chat/page.tsx",
  "web/app/api/chat/route.ts",
];
const RELEVANT_DIRTY_CANDIDATES = [
  ...PROTECTED_FILES,
  "web/lib/models.ts",
  "web/lib/nvidia.ts",
  "web/src/data/episodes.json",
  "web/src/data/connections.json",
  "web/src/data/corpus-manifest.json",
];

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function git(args, options = {}) {
  const forbidden = new Set([
    "cl" + "ean",
    "re" + "set",
    "check" + "out",
    "res" + "tore",
    "sta" + "sh",
    "a" + "dd",
    "com" + "mit",
    "r" + "m",
  ]);
  if (forbidden.has(args[0])) {
    throw new Error(`Refusing prohibited repository mutation subcommand: ${args[0]}`);
  }
  return execFileSync("git", args, {
    cwd: REPOSITORY_ROOT,
    maxBuffer: 16 * 1024 * 1024,
    ...options,
  });
}

function assertSourceSafety() {
  const source = fs.readFileSync(fileURLToPath(import.meta.url), "utf8");
  const verbs = ["cl" + "ean", "re" + "set", "check" + "out", "res" + "tore", "sta" + "sh"];
  const destructive = new RegExp(`\\bgit\\s+(?:${verbs.join("|")})\\b`, "i");
  if (destructive.test(source)) {
    throw new Error("A destructive repository command was detected in the capture source");
  }
}

function classify(stat) {
  if (stat.isFile()) return "file";
  if (stat.isSymbolicLink()) return "symlink";
  if (stat.isDirectory()) return "directory";
  if (stat.isBlockDevice()) return "block-device";
  if (stat.isCharacterDevice()) return "character-device";
  if (stat.isFIFO()) return "fifo";
  if (stat.isSocket()) return "socket";
  return "other";
}

function hashRepositoryPath(repositoryPath) {
  if (path.isAbsolute(repositoryPath) || repositoryPath.split("/").includes("..")) {
    throw new Error(`Repository path is not bounded: ${repositoryPath}`);
  }
  const absolute = path.join(REPOSITORY_ROOT, repositoryPath);
  const stat = fs.lstatSync(absolute);
  const type = classify(stat);
  let content;
  if (type === "file") content = fs.readFileSync(absolute);
  else if (type === "symlink") content = Buffer.from(fs.readlinkSync(absolute));
  else content = Buffer.from(`non-content:${type}`);
  return {
    path: repositoryPath,
    sha256: sha256(content),
    mode: (stat.mode & 0o777777).toString(8),
    type,
  };
}

function splitNul(buffer) {
  const values = [];
  let start = 0;
  for (let index = 0; index < buffer.length; index += 1) {
    if (buffer[index] !== 0) continue;
    values.push(buffer.subarray(start, index));
    start = index + 1;
  }
  if (start !== buffer.length) throw new Error("Git output was not NUL terminated");
  return values;
}

function parsePorcelain(raw) {
  const tokens = splitNul(raw);
  const records = [];
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (token.length < 4 || token[2] !== 32) {
      throw new Error(`Malformed porcelain record at index ${index}`);
    }
    const xy = token.subarray(0, 2).toString("ascii");
    const pathBytes = token.subarray(3);
    let originalPathBytes = null;
    const rawParts = [token, Buffer.from([0])];
    if ("RC".includes(xy[0]) || "RC".includes(xy[1])) {
      index += 1;
      if (index >= tokens.length) throw new Error("Rename/copy record lacks its source path");
      originalPathBytes = tokens[index];
      rawParts.push(originalPathBytes, Buffer.from([0]));
    }
    records.push({
      xy,
      pathBytes,
      originalPathBytes,
      raw: Buffer.concat(rawParts),
    });
  }
  return records;
}

function statusByPath(raw) {
  const statuses = new Map();
  for (const record of parsePorcelain(raw)) {
    statuses.set(record.pathBytes.toString("utf8"), record.xy);
  }
  return statuses;
}

function worktreeMetadata(pathBytes) {
  const absolute = Buffer.concat([
    Buffer.from(`${REPOSITORY_ROOT}${path.sep}`),
    pathBytes,
  ]);
  try {
    const stat = fs.lstatSync(absolute);
    const type = classify(stat);
    let content;
    if (type === "file") content = fs.readFileSync(absolute);
    else if (type === "symlink") content = Buffer.from(fs.readlinkSync(absolute, { encoding: "buffer" }));
    else content = Buffer.from(`non-content:${type}`);
    return {
      exists: true,
      type,
      mode: (stat.mode & 0o777777).toString(8),
      sha256: sha256(content),
    };
  } catch (error) {
    if (error?.code === "ENOENT") {
      return { exists: false, type: "absent", mode: null, sha256: "absent" };
    }
    throw error;
  }
}

function indexMetadata(pathBytes, staged) {
  if (!staged) return { staged: false, entries: [] };
  const input = Buffer.concat([pathBytes, Buffer.from([0])]);
  const output = git(
    ["ls-files", "--stage", "-z", "--pathspec-from-file=-", "--pathspec-file-nul"],
    { input },
  );
  const entries = [];
  for (const row of splitNul(output)) {
    const tab = row.indexOf(9);
    if (tab < 0) continue;
    const [mode, blob, stage] = row.subarray(0, tab).toString("ascii").split(" ");
    entries.push({ mode, blob, stage });
  }
  return { staged: true, entries };
}

function currentSnapshotRecord(snapshotRecord) {
  const pathBytes = Buffer.from(snapshotRecord.path_base64, "base64");
  const staged = snapshotRecord.xy[0] !== " " && !["?", "!"].includes(snapshotRecord.xy[0]);
  return {
    xy: snapshotRecord.xy,
    path_base64: snapshotRecord.path_base64,
    original_path_base64: snapshotRecord.original_path_base64,
    worktree: worktreeMetadata(pathBytes),
    index: indexMetadata(pathBytes, staged),
  };
}

function buildManifest() {
  const rawStatus = git(["status", "--porcelain=v1", "-z", "--untracked-files=all"]);
  const statuses = statusByPath(rawStatus);
  const protectedFiles = PROTECTED_FILES.map((repositoryPath) => ({
    ...hashRepositoryPath(repositoryPath),
    worktree_status: statuses.get(repositoryPath) ?? "clean",
  }));
  const relevantDirtyPaths = RELEVANT_DIRTY_CANDIDATES.filter((repositoryPath) => statuses.has(repositoryPath))
    .map((repositoryPath) => ({
      ...hashRepositoryPath(repositoryPath),
      worktree_status: statuses.get(repositoryPath),
    }));

  return {
    schema_version: 1,
    authority: "current-dirty-worktree-pending-owner-approval",
    base_sha: git(["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
    protected_routes: ["/", "/episodes", "/connections", "/chat", "/api/chat"],
    protected_files: protectedFiles,
    relevant_dirty_paths: relevantDirtyPaths,
    navigation: [
      { label: "Control Room", destination: "/" },
      { label: "Episodes", destination: "/episodes" },
      { label: "Connections", destination: "/connections" },
      { label: "Ask WTF", destination: "/chat" },
    ],
    route_contracts: {
      "/": {
        kind: "public page",
        query_behavior: "no route-owned query behavior",
        navigation_destinations: ["/chat", "/episodes", "/connections"],
        data_semantics: "public catalogue introduction and public episode/connection discovery",
      },
      "/episodes": {
        kind: "public page",
        query_behavior: "no current episode query selection",
        selection_behavior: {
          state: "client-local active episode object",
          open: "episode card activation",
          close: ["close control", "backdrop activation", "Escape"],
          refresh_back_share: "open episode is not reproduced",
          ask_destination: "/chat?q=<encoded episode question>",
        },
        data_semantics: "episodes grouped by existing playlist title with public transcript fallback",
      },
      "/connections": {
        kind: "public page",
        query_behavior: "no route-owned query behavior",
        data_semantics: "recurring public themes and ideas shown as a graph plus public lists",
      },
      "/chat": {
        kind: "public page",
        query_behavior: {
          parameter: "q",
          value_selection: "URLSearchParams.get first value",
          non_empty_value: "auto-submit exactly once per mounted page",
          empty_or_absent_value: "no automatic submission",
          unrelated_parameters: "left in the URL and ignored by the current page",
        },
        data_semantics: "visitor question, public answer text, and cited public sources",
      },
      "/api/chat": {
        kind: "public POST endpoint",
        query_behavior: "none",
        data_semantics: "server-authenticated edge retrieval projected into the browser compatibility contract",
      },
    },
    public_field_allowlists: {
      home: ["brand assets", "catalogue-scoped episode/show counts", "public thumbnails", "public guest names", "public route copy"],
      episodes: ["video_id", "title", "playlist_title", "thumbnail", "duration", "view_count", "transcript availability", "transcript excerpt", "source URL", "verified timestamp"],
      connections: ["node id", "label", "category", "episode count", "public episode ids", "public episode titles", "public source links", "edge endpoint ids", "shared count"],
      chat: ["visitor current question", "safe public answer text", "n", "video_id", "title", "score", "t", "time", "url"],
    },
    chat_contract: {
      method: "POST",
      request: {
        accepted_body_member: "messages",
        non_array_messages: "treated as an empty message list",
        history_window: "last 8 messages only",
        selected_question: "last user-role message in the retained window",
        whitespace_rule: "trimmed content must be non-empty; original content is forwarded",
        accepted_question_limit: { maximum_javascript_string_length: 2000 },
        client_model_member: "sent by the current client but ignored by the current route",
      },
      upstream_boundary: {
        request_body: "selected question only",
        timeout_ms: 25000,
        route_max_duration_seconds: 30,
        cache: "no-store",
        authentication: "server-only and never returned to the browser",
        correlation: "server-generated request identifier and forwarded first client IP value",
      },
      branches: [
        { case: "invalid JSON", status: 400, body_kind: "plain text", safe_body: "bad json", upstream_called: false },
        { case: "missing, empty, non-array, or absent retained user message", status: 400, body_kind: "plain text", safe_body: "no user message", upstream_called: false },
        { case: "selected question exceeds 2000 JavaScript string units", status: 400, body_kind: "plain text", safe_body: "question too long", upstream_called: false },
        { case: "server-only edge authentication unavailable", status: 503, body_kind: "JSON error", safe_body: "The answer service is not configured.", upstream_called: false },
        { case: "network, timeout, or fetch failure", status: 503, body_kind: "JSON error", safe_body: "The answer service is temporarily unavailable. Please retry shortly." },
        { case: "upstream non-success, malformed JSON, or missing string answer", status: 503, body_kind: "JSON error", safe_body: "The answer service is temporarily unavailable. Please retry shortly." },
        { case: "valid upstream answer", status: "upstream successful status", body_kind: "plain text answer", sources: "empty array when upstream sources is not an array" },
      ],
      headers: ["X-Sources", "X-Model", "X-Fallback", "Content-Type", "Cache-Control"],
      success_headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "X-Sources": "URI-encoded JSON array of mapped public source fields",
        "X-Model": "fixed server-selected compatibility label",
        "X-Fallback": "false only when the upstream grounded flag is truthy; otherwise true",
        "Cache-Control": "no-store",
      },
      source_keys: ["n", "video_id", "title", "score", "t", "time", "url"],
      source_mapping: {
        n: "upstream source number",
        video_id: "upstream videoId",
        title: "upstream public title",
        score: "upstream score",
        t: "upstream start number or null",
        time: "empty for null start; otherwise UTC clock text derived from start seconds",
        url: "upstream public URL",
      },
      streaming: {
        proxy: "awaits the complete Worker JSON response before constructing a plain-text Response",
        first_byte_meaning: "the proxy has a complete parsed answer; it is not evidence of first model-token timing",
        transport_chunks: "runtime transport may deliver one or more chunks; source does not promise token cadence or chunk count",
        browser: "reads response.body with ReadableStream.getReader(), decodes each delivered chunk, and updates accumulated text after each read",
        headers: "sources, model compatibility, and fallback metadata are read before the body loop",
      },
    },
  };
}

function manifestText(manifest) {
  return `${JSON.stringify(manifest, null, 2)}\n`;
}

function assertWriteTarget(target) {
  if (path.resolve(target) !== path.resolve(MANIFEST_PATH)) {
    throw new Error("Capture attempted to write outside its declared manifest artifact");
  }
}

function snapshotRoot() {
  return path.resolve(
    REPOSITORY_ROOT,
    git(["rev-parse", "--git-path", "phase1-snapshots/01-01-task1"], { encoding: "utf8" }).trim(),
  );
}

function removeSnapshot(root) {
  const expected = snapshotRoot();
  if (path.resolve(root) !== expected) throw new Error("Refusing to remove an unexpected snapshot path");
  fs.rmSync(root, { recursive: true, force: true });
}

function verifySnapshotPreservation() {
  const root = snapshotRoot();
  try {
    const snapshotPath = path.join(root, "snapshot.json");
    const statusPath = path.join(root, "status.bin");
    if (!fs.existsSync(snapshotPath) || !fs.existsSync(statusPath)) {
      throw new Error("The required pre-task snapshot is absent");
    }
    const snapshot = JSON.parse(fs.readFileSync(snapshotPath, "utf8"));
    const rawSnapshot = fs.readFileSync(statusPath);
    if (rawSnapshot.toString("base64") !== snapshot.status_base64) {
      throw new Error("Snapshot status bytes and encoded snapshot disagree");
    }
    if (sha256(rawSnapshot) !== snapshot.status_sha256) {
      throw new Error("Snapshot status digest is invalid");
    }

    const rawPost = git(["status", "--porcelain=v1", "-z", "--untracked-files=all"]);
    const allowed = new Set(TASK_PATHS.map((value) => Buffer.from(value).toString("base64")));
    const seen = new Set();
    const retained = [];
    for (const record of parsePorcelain(rawPost)) {
      const encodedPath = record.pathBytes.toString("base64");
      if (allowed.has(encodedPath)) {
        if (record.xy !== "??" || record.originalPathBytes) {
          throw new Error("A Task 1 artifact is not an exact newly-untracked record");
        }
        if (seen.has(encodedPath)) throw new Error("A Task 1 artifact appears more than once");
        seen.add(encodedPath);
      } else {
        retained.push(record.raw);
      }
    }
    if (seen.size !== TASK_PATHS.length) {
      throw new Error("The post-task status does not contain exactly the four Task 1 records");
    }
    const filteredPost = Buffer.concat(retained);
    if (!filteredPost.equals(rawSnapshot)) {
      throw new Error("The non-Task-1 porcelain record set changed from the authoritative snapshot");
    }

    for (const expected of snapshot.records) {
      const current = currentSnapshotRecord(expected);
      if (JSON.stringify(current) !== JSON.stringify(expected)) {
        throw new Error(`A pre-existing dirty entry changed: ${expected.path_base64}`);
      }
    }

    const expectedManifest = manifestText(buildManifest());
    const actualManifest = fs.readFileSync(MANIFEST_PATH, "utf8");
    if (actualManifest !== expectedManifest) {
      throw new Error("The compatibility manifest is stale or non-deterministic");
    }

    return {
      status: "passed",
      pre_status_sha256: snapshot.status_sha256,
      post_status_sha256: sha256(rawPost),
      filtered_status_sha256: sha256(filteredPost),
      preserved_record_count: snapshot.records.length,
      allowed_delta_count: seen.size,
      manifest_sha256: sha256(actualManifest),
    };
  } finally {
    removeSnapshot(root);
  }
}

assertSourceSafety();
process.chdir(REPOSITORY_ROOT);

const mode = process.argv[2] ?? "--print";
if (mode === "--print") {
  process.stdout.write(manifestText(buildManifest()));
} else if (mode === "--write") {
  assertWriteTarget(MANIFEST_PATH);
  fs.writeFileSync(MANIFEST_PATH, manifestText(buildManifest()), { flag: "wx" });
} else if (mode === "--check") {
  process.stdout.write(`${JSON.stringify(verifySnapshotPreservation())}\n`);
} else {
  throw new Error(`Unknown mode: ${mode}`);
}
