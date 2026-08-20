import { spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPOSITORY_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const RESULT_KEYS = [
  "plan",
  "task",
  "command_id",
  "command",
  "exit_status",
  "evidence",
  "completed_at",
  "status",
].sort();
const EVIDENCE_KEYS = [
  "output_sha256",
  "error_output_sha256",
  "output_bytes",
  "error_output_bytes",
].sort();

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function parseArgs(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 2) {
    const flag = argv[index];
    const value = argv[index + 1];
    if (!["--plan", "--task"].includes(flag) || value === undefined) {
      throw new Error("Usage: node web/scripts/run-phase1-threat.mjs --plan NN-NN --task N");
    }
    if (options[flag]) throw new Error(`Duplicate argument: ${flag}`);
    options[flag] = value;
  }
  if (!/^\d{2}-\d{2}$/.test(options["--plan"] ?? "")) throw new Error("Invalid plan identifier");
  if (!/^[1-9]\d*$/.test(options["--task"] ?? "")) throw new Error("Invalid task number");
  return { plan: options["--plan"], task: Number(options["--task"]) };
}

function walkPlans(directory) {
  const found = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) found.push(...walkPlans(absolute));
    else if (entry.isFile() && /^\d{2}-\d{2}-PLAN\.md$/.test(entry.name)) found.push(absolute);
  }
  return found.sort();
}

function splitMarkdownRow(line) {
  const cells = [];
  let cell = "";
  for (let index = 1; index < line.length; index += 1) {
    const character = line[index];
    if (character === "\\" && line[index + 1] === "|") {
      cell += "|";
      index += 1;
    } else if (character === "|") {
      cells.push(cell.trim());
      cell = "";
    } else {
      cell += character;
    }
  }
  return cells;
}

function decodeHtml(value) {
  return value
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function definitionsFromPlan(planPath) {
  const source = fs.readFileSync(planPath, "utf8");
  const threatBlock = source.match(/<threat_model>([\s\S]*?)<\/threat_model>/)?.[1];
  if (!threatBlock) return [];
  const lines = threatBlock.split("\n");
  const headerIndex = lines.findIndex((line) => line.startsWith("| Threat ID |"));
  if (headerIndex < 0) throw new Error(`Threat table header missing in ${path.basename(planPath)}`);
  const headers = splitMarkdownRow(lines[headerIndex]);
  const threatIndex = headers.indexOf("Threat ID");
  const taskIndex = headers.indexOf("Owning task");
  const commandIndex = headers.indexOf("Automated command");
  if ([threatIndex, taskIndex, commandIndex].some((index) => index < 0)) {
    throw new Error(`Threat table columns drifted in ${path.basename(planPath)}`);
  }
  const plan = path.basename(planPath).replace(/-PLAN\.md$/, "");
  return lines
    .filter((line) => /^\| T-[^|]+\|/.test(line))
    .map((line) => {
      const cells = splitMarkdownRow(line);
      if (cells.length !== headers.length) throw new Error(`Malformed threat row ${cells[threatIndex] ?? "unknown"}`);
      const taskMatch = cells[taskIndex].match(/^Task (\d+)$/);
      if (!taskMatch) throw new Error(`Invalid owning task for ${cells[threatIndex]}`);
      return {
        id: cells[threatIndex],
        plan,
        task: Number(taskMatch[1]),
        command: decodeHtml(cells[commandIndex]),
      };
    });
}

function loadDefinitions() {
  const planningRoot = path.join(REPOSITORY_ROOT, ".planning/phases");
  const planPaths = walkPlans(planningRoot);
  const plans = new Map();
  const definitions = new Map();
  for (const planPath of planPaths) {
    const plan = path.basename(planPath).replace(/-PLAN\.md$/, "");
    if (plans.has(plan)) throw new Error(`Duplicate plan identifier: ${plan}`);
    plans.set(plan, planPath);
    for (const definition of definitionsFromPlan(planPath)) {
      if (definitions.has(definition.id)) throw new Error(`Duplicate global threat identifier: ${definition.id}`);
      definitions.set(definition.id, definition);
    }
  }
  return { plans, definitions };
}

function parseJsonWithoutDuplicateKeys(source) {
  let index = 0;
  const whitespace = () => { while (/\s/.test(source[index] ?? "")) index += 1; };
  const parseString = () => {
    const start = index;
    if (source[index] !== '"') throw new Error("Expected JSON string");
    index += 1;
    while (index < source.length) {
      if (source[index] === "\\") index += 2;
      else if (source[index] === '"') {
        index += 1;
        return JSON.parse(source.slice(start, index));
      } else index += 1;
    }
    throw new Error("Unterminated JSON string");
  };
  const parseValue = () => {
    whitespace();
    if (source[index] === "{") {
      index += 1;
      const result = {};
      const keys = new Set();
      whitespace();
      if (source[index] === "}") { index += 1; return result; }
      for (;;) {
        whitespace();
        const key = parseString();
        if (keys.has(key)) throw new Error(`Duplicate JSON key: ${key}`);
        keys.add(key);
        whitespace();
        if (source[index] !== ":") throw new Error("Expected JSON colon");
        index += 1;
        result[key] = parseValue();
        whitespace();
        if (source[index] === "}") { index += 1; return result; }
        if (source[index] !== ",") throw new Error("Expected JSON object comma");
        index += 1;
      }
    }
    if (source[index] === "[") {
      index += 1;
      const result = [];
      whitespace();
      if (source[index] === "]") { index += 1; return result; }
      for (;;) {
        result.push(parseValue());
        whitespace();
        if (source[index] === "]") { index += 1; return result; }
        if (source[index] !== ",") throw new Error("Expected JSON array comma");
        index += 1;
      }
    }
    if (source[index] === '"') return parseString();
    const match = source.slice(index).match(/^(?:-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?|true|false|null)/);
    if (!match) throw new Error("Invalid JSON value");
    index += match[0].length;
    return JSON.parse(match[0]);
  };
  const value = parseValue();
  whitespace();
  if (index !== source.length) throw new Error("Trailing JSON content");
  return value;
}

function commandId(definition) {
  return sha256(`${definition.plan}\0${definition.task}\0${definition.id}\0${definition.command}`);
}

function exactKeys(value, expected) {
  return value && typeof value === "object" && !Array.isArray(value)
    && JSON.stringify(Object.keys(value).sort()) === JSON.stringify(expected);
}

function validateSafeStrings(value, location = "root") {
  if (Array.isArray(value)) {
    value.forEach((item, index) => validateSafeStrings(item, `${location}[${index}]`));
    return;
  }
  if (value && typeof value === "object") {
    for (const [key, item] of Object.entries(value)) {
      const prohibitedKey = /^(?:stdout|stderr|request|response|prompt|body|payload|environment|env|credentials?|secrets?|private)$/i;
      if (prohibitedKey.test(key)) throw new Error(`Prohibited evidence field at ${location}.${key}`);
      validateSafeStrings(item, `${location}.${key}`);
    }
    return;
  }
  if (typeof value !== "string") return;
  if (value.length > 8192) throw new Error(`Unbounded string at ${location}`);
  if (/(?:\/Users\/|\/Volumes\/|[A-Za-z]:\\\\Users\\\\)/.test(value)) {
    throw new Error(`Machine-local path at ${location}`);
  }
  if (/(?:\bBearer\s+[A-Za-z0-9._~-]+|\b(?:sk|ghp|github_pat)_[A-Za-z0-9_-]{12,})/.test(value)) {
    throw new Error(`Credential-like material at ${location}`);
  }
  if (/\b[A-Z][A-Z0-9_]{2,}\s*=\s*[^=\s][^\s]*/.test(value)) {
    throw new Error(`Environment assignment at ${location}`);
  }
}

function validateFragment(fragment, plan, planDefinitions) {
  if (!exactKeys(fragment, ["plan", "results", "schema_version"].sort())) {
    throw new Error("Fragment top-level schema drift");
  }
  if (fragment.schema_version !== 1 || fragment.plan !== plan) throw new Error("Fragment plan/schema mismatch");
  if (!fragment.results || typeof fragment.results !== "object" || Array.isArray(fragment.results)) {
    throw new Error("Fragment results must be an object");
  }
  const now = Date.now();
  for (const [threatId, result] of Object.entries(fragment.results)) {
    const definition = planDefinitions.get(threatId);
    if (!definition) throw new Error(`Fragment contains a threat not owned by ${plan}: ${threatId}`);
    if (!exactKeys(result, RESULT_KEYS)) throw new Error(`Result schema drift: ${threatId}`);
    if (result.plan !== plan || result.task !== definition.task) throw new Error(`Result owner/task drift: ${threatId}`);
    if (result.command !== definition.command || result.command_id !== commandId(definition)) {
      throw new Error(`Result command drift: ${threatId}`);
    }
    if (!Number.isInteger(result.exit_status) || result.exit_status < 0) throw new Error(`Invalid exit status: ${threatId}`);
    if (!exactKeys(result.evidence, EVIDENCE_KEYS)) throw new Error(`Evidence schema drift: ${threatId}`);
    if (!["passed", "failed"].includes(result.status)) throw new Error(`Invalid result status: ${threatId}`);
    if ((result.exit_status === 0) !== (result.status === "passed")) throw new Error(`Status/exit mismatch: ${threatId}`);
    const completedAt = Date.parse(result.completed_at);
    if (!Number.isFinite(completedAt) || completedAt > now) throw new Error(`Invalid or future timestamp: ${threatId}`);
  }
  validateSafeStrings(fragment);
}

function loadFragment(fragmentPath, plan) {
  if (!fs.existsSync(fragmentPath)) return { schema_version: 1, plan, results: {} };
  return parseJsonWithoutDuplicateKeys(fs.readFileSync(fragmentPath, "utf8"));
}

function runCommand(command) {
  const execution = spawnSync(command, {
    cwd: REPOSITORY_ROOT,
    shell: "/bin/sh",
    encoding: null,
    maxBuffer: 1024 * 1024,
    env: process.env,
  });
  const output = Buffer.isBuffer(execution.stdout) ? execution.stdout : Buffer.alloc(0);
  const errorOutput = Buffer.isBuffer(execution.stderr) ? execution.stderr : Buffer.alloc(0);
  const exitStatus = Number.isInteger(execution.status) ? execution.status : 1;
  return {
    exitStatus,
    evidence: {
      output_sha256: sha256(output),
      error_output_sha256: sha256(errorOutput),
      output_bytes: output.length,
      error_output_bytes: errorOutput.length,
    },
  };
}

function atomicWrite(fragmentPath, fragment) {
  const directory = path.dirname(fragmentPath);
  const expectedDirectory = path.join(REPOSITORY_ROOT, "web/tests/security/phase1-threat-results");
  if (path.resolve(directory) !== path.resolve(expectedDirectory)) {
    throw new Error("Refusing to write outside the plan-fragment directory");
  }
  fs.mkdirSync(directory, { recursive: true });
  const temporary = path.join(directory, `.${path.basename(fragmentPath)}.${process.pid}.${crypto.randomBytes(6).toString("hex")}.tmp`);
  try {
    fs.writeFileSync(temporary, `${JSON.stringify(fragment, null, 2)}\n`, { flag: "wx" });
    fs.renameSync(temporary, fragmentPath);
  } finally {
    if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
  }
}

const { plan, task } = parseArgs(process.argv.slice(2));
process.chdir(REPOSITORY_ROOT);
const { plans, definitions } = loadDefinitions();
if (!plans.has(plan)) throw new Error(`Unknown plan: ${plan}`);
const planDefinitions = new Map([...definitions].filter(([, definition]) => definition.plan === plan));
const selected = [...planDefinitions.values()].filter((definition) => definition.task === task);
if (!selected.length) throw new Error(`No threats owned by ${plan} Task ${task}`);

const fragmentPath = path.join(REPOSITORY_ROOT, `web/tests/security/phase1-threat-results/${plan}.json`);
if (path.basename(fragmentPath) !== `${plan}.json`) throw new Error("Fragment path/plan mismatch");
const fragment = loadFragment(fragmentPath, plan);
validateFragment(fragment, plan, planDefinitions);

const executions = new Map();
for (const definition of selected) {
  if (!executions.has(definition.command)) executions.set(definition.command, runCommand(definition.command));
}
const completedAt = new Date().toISOString();
for (const definition of selected) {
  const execution = executions.get(definition.command);
  fragment.results[definition.id] = {
    plan,
    task,
    command_id: commandId(definition),
    command: definition.command,
    exit_status: execution.exitStatus,
    evidence: execution.evidence,
    completed_at: completedAt,
    status: execution.exitStatus === 0 ? "passed" : "failed",
  };
}
validateFragment(fragment, plan, planDefinitions);
atomicWrite(fragmentPath, fragment);

const failed = selected.find((definition) => fragment.results[definition.id].status === "failed");
process.stdout.write(`${JSON.stringify({ plan, task, threats: selected.map((definition) => definition.id), status: failed ? "failed" : "passed" })}\n`);
if (failed) process.exit(fragment.results[failed.id].exit_status || 1);
