import { spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const phaseDirectory = path.join(root, ".planning/phases/02-platform-foundation-authenticated-policy-boundary");
const ledgerPath = path.join(phaseDirectory, "02-VALIDATION.md");
const canonicalFragmentRoot = path.join(root, "web/tests/security/phase2-threat-results");
const resultKeys = ["command", "command_id", "completed_at", "evidence", "exit_status", "plan", "status", "task"].sort();
const evidenceKeys = ["error_output_bytes", "error_output_sha256", "output_bytes", "output_sha256"].sort();

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function splitMarkdownRow(line) {
  return line.split("|").map((value) => value.trim());
}

function decodeHtml(value) {
  return value.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
}

function exactKeys(value, expected) {
  return value && typeof value === "object" && !Array.isArray(value)
    && JSON.stringify(Object.keys(value).sort()) === JSON.stringify(expected);
}

function parseJsonWithoutDuplicateKeys(source) {
  let index = 0;
  const whitespace = () => { while (/\s/.test(source[index] ?? "")) index += 1; };
  const string = () => {
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
  const value = () => {
    whitespace();
    if (source[index] === "{") {
      index += 1;
      const object = {}; const keys = new Set();
      whitespace();
      if (source[index] === "}") { index += 1; return object; }
      for (;;) {
        whitespace(); const key = string();
        if (keys.has(key)) throw new Error(`Duplicate JSON key: ${key}`);
        keys.add(key); whitespace();
        if (source[index] !== ":") throw new Error("Expected JSON colon");
        index += 1; object[key] = value(); whitespace();
        if (source[index] === "}") { index += 1; return object; }
        if (source[index] !== ",") throw new Error("Expected JSON object comma");
        index += 1;
      }
    }
    if (source[index] === "[") {
      index += 1;
      const array = []; whitespace();
      if (source[index] === "]") { index += 1; return array; }
      for (;;) {
        array.push(value()); whitespace();
        if (source[index] === "]") { index += 1; return array; }
        if (source[index] !== ",") throw new Error("Expected JSON array comma");
        index += 1;
      }
    }
    if (source[index] === '"') return string();
    const token = source.slice(index).match(/^(?:-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?|true|false|null)/);
    if (!token) throw new Error("Invalid JSON value");
    index += token[0].length;
    return JSON.parse(token[0]);
  };
  const parsed = value(); whitespace();
  if (index !== source.length) throw new Error("Trailing JSON content");
  return parsed;
}

function commandId(definition) {
  return sha256(`${definition.plan}\0${definition.task}\0${definition.id}\0${definition.command}`);
}

function validateSafeStrings(value, location = "root") {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => validateSafeStrings(entry, `${location}[${index}]`));
    return;
  }
  if (value && typeof value === "object") {
    for (const [key, entry] of Object.entries(value)) {
      if (/^(?:stdout|stderr|request|response|prompt|body|payload|environment|env|credentials?|secrets?|private)$/i.test(key)) {
        throw new Error(`Prohibited evidence field at ${location}.${key}`);
      }
      validateSafeStrings(entry, `${location}.${key}`);
    }
    return;
  }
  if (typeof value !== "string") return;
  if (value.length > 8192) throw new Error(`Unbounded value at ${location}`);
  if (/(?:\/Users\/|\/Volumes\/|[A-Za-z]:\\\\Users\\\\)/.test(value)) throw new Error(`Machine-local path at ${location}`);
  if (/(?:\bBearer\s+[A-Za-z0-9._~-]+|\b(?:sk|ghp|github_pat)_[A-Za-z0-9_-]{12,})/.test(value)) throw new Error(`Credential-like value at ${location}`);
  if (/\b[A-Z][A-Z0-9_]{2,}\s*=\s*[^=\s][^\s]*/.test(value)) throw new Error(`Environment assignment at ${location}`);
  if (/https?:\/\//i.test(value)) throw new Error(`Hostname value at ${location}`);
}

function definitionsFromPlan(source, plan) {
  const block = source.match(/<threat_model>([\s\S]*?)<\/threat_model>/)?.[1];
  if (!block) throw new Error(`Missing threat model: ${plan}`);
  const rows = block.split("\n").map(splitMarkdownRow);
  const definitions = [];
  for (const row of rows) {
    if (!/^T-02-\d{2}$/.test(row[1] ?? "")) continue;
    const task = Number((row[5] ?? "").match(/^Task (\d+)$/)?.[1]);
    if (!Number.isInteger(task)) throw new Error(`Invalid owning task: ${row[1]}`);
    definitions.push({ id: row[1], plan, task, command: decodeHtml(row[6] ?? "") });
  }
  return definitions;
}

export function loadDefinitions() {
  const definitions = new Map();
  const planFiles = fs.readdirSync(phaseDirectory).filter((file) => /^02-\d\d-PLAN\.md$/.test(file)).sort();
  for (const file of planFiles) {
    const plan = file.slice(0, 5);
    for (const definition of definitionsFromPlan(fs.readFileSync(path.join(phaseDirectory, file), "utf8"), plan)) {
      if (definitions.has(definition.id)) throw new Error(`Duplicate threat ID: ${definition.id}`);
      definitions.set(definition.id, definition);
    }
  }
  return definitions;
}

function loadLedgerDefinitions() {
  const definitions = new Map();
  for (const row of fs.readFileSync(ledgerPath, "utf8").split("\n").map(splitMarkdownRow)) {
    if (!/^T-02-\d{2}$/.test(row[1] ?? "")) continue;
    const task = Number((row[3] ?? "").match(/^Task (\d+)$/)?.[1]);
    if (!Number.isInteger(task)) throw new Error(`Invalid ledger task: ${row[1]}`);
    if (definitions.has(row[1])) throw new Error(`Duplicate ledger threat ID: ${row[1]}`);
    definitions.set(row[1], { id: row[1], plan: row[2], task, command: decodeHtml(row[5] ?? "") });
  }
  return definitions;
}

export function validateDefinitionLedger(definitions = loadDefinitions()) {
  const ledger = loadLedgerDefinitions();
  if (definitions.size !== 35 || ledger.size !== definitions.size) throw new Error("Threat definition count drift");
  for (const [id, definition] of definitions) {
    if (JSON.stringify(ledger.get(id)) !== JSON.stringify(definition)) throw new Error(`Ledger definition drift: ${id}`);
  }
  return definitions;
}

function validateResult(result, plan, definition, threatId) {
  if (!exactKeys(result, resultKeys)) throw new Error(`Result schema drift: ${threatId}`);
  if (result.plan !== plan || result.task !== definition.task) throw new Error(`Owner/task drift: ${threatId}`);
  if (result.command !== definition.command || result.command_id !== commandId(definition)) throw new Error(`Command drift: ${threatId}`);
  if (!Number.isInteger(result.exit_status) || result.exit_status < 0) throw new Error(`Exit status drift: ${threatId}`);
  if (!exactKeys(result.evidence, evidenceKeys)) throw new Error(`Evidence schema drift: ${threatId}`);
  if ((result.exit_status === 0) !== (result.status === "passed")) throw new Error(`Status drift: ${threatId}`);
  if (!["passed", "failed"].includes(result.status)) throw new Error(`Invalid status: ${threatId}`);
  const completedAt = Date.parse(result.completed_at);
  if (!Number.isFinite(completedAt) || completedAt > Date.now()) throw new Error(`Invalid or future timestamp: ${threatId}`);
}

export function validateFragment(fragment, plan, definitions = loadDefinitions()) {
  if (!exactKeys(fragment, ["plan", "results", "schema_version"].sort())) throw new Error("Fragment schema drift");
  if (fragment.schema_version !== 1 || fragment.plan !== plan) throw new Error("Fragment plan/schema mismatch");
  if (!fragment.results || typeof fragment.results !== "object" || Array.isArray(fragment.results)) throw new Error("Fragment results must be an object");
  for (const [id, result] of Object.entries(fragment.results)) {
    const definition = definitions.get(id);
    if (!definition || definition.plan !== plan) throw new Error(`Unknown threat ID: ${id}`);
    validateResult(result, plan, definition, id);
  }
  validateSafeStrings(fragment);
  return fragment;
}

function loadFragment(fragmentRoot, plan) {
  const fragmentPath = path.join(fragmentRoot, `${plan}.json`);
  if (!fs.existsSync(fragmentPath)) return { schema_version: 1, plan, results: {} };
  return parseJsonWithoutDuplicateKeys(fs.readFileSync(fragmentPath, "utf8"));
}

function atomicWriteFragment(fragmentRoot, plan, fragment) {
  fs.mkdirSync(fragmentRoot, { recursive: true });
  if (fs.lstatSync(fragmentRoot).isSymbolicLink()) throw new Error("Refusing symlinked fragment directory");
  const target = path.join(fragmentRoot, `${plan}.json`);
  if (fs.existsSync(target) && fs.lstatSync(target).isSymbolicLink()) throw new Error("Refusing symlinked fragment target");
  const temporary = path.join(fragmentRoot, `.${plan}.${process.pid}.${crypto.randomBytes(6).toString("hex")}.tmp`);
  try {
    fs.writeFileSync(temporary, `${JSON.stringify(fragment, null, 2)}\n`, { encoding: "utf8", flag: "wx", mode: 0o600 });
    fs.renameSync(temporary, target);
  } finally {
    if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
  }
}

function defaultRunCommand(command) {
  const result = spawnSync(command, { cwd: root, shell: "/bin/sh", encoding: null, maxBuffer: 10 * 1024 * 1024 });
  return {
    exitStatus: Number.isInteger(result.status) ? result.status : 1,
    output: Buffer.isBuffer(result.stdout) ? result.stdout : Buffer.alloc(0),
    errorOutput: Buffer.isBuffer(result.stderr) ? result.stderr : Buffer.alloc(0),
  };
}

export function executeTask({ plan, task, definitions = loadDefinitions(), fragmentRoot = canonicalFragmentRoot, completedAt = new Date().toISOString(), runCommand = defaultRunCommand }) {
  validateDefinitionLedger(definitions);
  const selected = [...definitions.values()].filter((definition) => definition.plan === plan && definition.task === task);
  if (!selected.length) throw new Error(`No threats owned by ${plan} Task ${task}`);
  const fragment = loadFragment(fragmentRoot, plan);
  validateFragment(fragment, plan, definitions);
  const executions = new Map();
  for (const definition of selected) {
    if (!executions.has(definition.command)) executions.set(definition.command, runCommand(definition.command));
  }
  for (const definition of selected) {
    const execution = executions.get(definition.command);
    const output = Buffer.isBuffer(execution.output) ? execution.output : Buffer.from(execution.output ?? "");
    const errorOutput = Buffer.isBuffer(execution.errorOutput) ? execution.errorOutput : Buffer.from(execution.errorOutput ?? "");
    const exitStatus = Number.isInteger(execution.exitStatus) && execution.exitStatus >= 0 ? execution.exitStatus : 1;
    fragment.results[definition.id] = {
      plan,
      task,
      command_id: commandId(definition),
      command: definition.command,
      exit_status: exitStatus,
      evidence: {
        output_sha256: sha256(output),
        error_output_sha256: sha256(errorOutput),
        output_bytes: output.length,
        error_output_bytes: errorOutput.length,
      },
      completed_at: completedAt,
      status: exitStatus === 0 ? "passed" : "failed",
    };
  }
  validateFragment(fragment, plan, definitions);
  atomicWriteFragment(fragmentRoot, plan, fragment);
  return fragment;
}

function parseCliArgs(argv) {
  if (argv.length === 1 && argv[0] === "--check-definitions") return { mode: "definitions" };
  if (argv.length !== 4 || argv[0] !== "--plan" || argv[2] !== "--task") throw new Error("Usage: --check-definitions | --plan 02-NN --task N");
  if (!/^02-\d\d$/.test(argv[1]) || !/^[1-9]\d*$/.test(argv[3])) throw new Error("Invalid plan or task");
  return { mode: "execute", plan: argv[1], task: Number(argv[3]) };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const options = parseCliArgs(process.argv.slice(2));
  if (options.mode === "definitions") {
    validateDefinitionLedger();
    console.log("Phase 2 threat ledger: 35 definitions with exact plan parity");
  } else {
    const fragment = executeTask(options);
    const failed = Object.values(fragment.results).filter((result) => result.status === "failed");
    if (failed.length) process.exitCode = 1;
  }
}
