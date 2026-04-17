import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const requiredFiles = [
  "app/_layout.tsx",
  "app/index.tsx",
  "app/runs/[fulfillmentId].tsx",
  "src/providers/AppProviders.tsx",
  "src/services/interfaces.ts",
  "src/services/local/localServices.ts",
  "src/workflow/defaultWorkflow.ts",
  "../../PLAN.md"
];

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDir, "..");
const missing = requiredFiles.filter((file) => !fs.existsSync(path.resolve(root, file)));

if (missing.length > 0) {
  console.error("Missing required scaffold files:");
  for (const file of missing) {
    console.error(`- ${file}`);
  }
  process.exit(1);
}

console.log("Smoke test passed.");
