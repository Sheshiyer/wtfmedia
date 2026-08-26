import { spawnSync } from "node:child_process";

const args = process.argv.slice(2);
const normalized = [];
for (let index = 0; index < args.length; index += 1) {
  if (args[index] === "--grep") {
    normalized.push("--testNamePattern", args[index + 1] ?? "");
    index += 1;
  } else {
    normalized.push(args[index]);
  }
}

const result = spawnSync("vitest", ["run", "--project=unit", ...normalized], { stdio: "inherit", shell: process.platform === "win32" });
process.exit(result.status ?? 1);
