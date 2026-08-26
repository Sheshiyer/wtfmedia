import { executeTask } from "./lib/phase2-threat-results.mjs";

function parseArgs(argv) {
  if (argv.length !== 4 || argv[0] !== "--plan" || argv[2] !== "--task") {
    throw new Error("Usage: node web/scripts/run-phase2-threat.mjs --plan 02-NN --task N");
  }
  if (!/^02-\d\d$/.test(argv[1]) || !/^[1-9]\d*$/.test(argv[3])) throw new Error("Invalid plan or task");
  return { plan: argv[1], task: Number(argv[3]) };
}

const options = parseArgs(process.argv.slice(2));
const fragment = executeTask(options);
if (Object.values(fragment.results).some((result) => result.status === "failed")) process.exitCode = 1;
