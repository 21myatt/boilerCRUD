import fs from "node:fs";
import path from "node:path";

const rootDir = path.resolve(import.meta.dirname, "..");
const contract = JSON.parse(
  fs.readFileSync(path.join(rootDir, "config/boilerplate-contract.json"), "utf8")
);

const lines = [
  "Boilerplate contract",
  "",
  `CI status check: ${contract.github.ci_status_check}`,
  `Staging branch: ${contract.github.staging_branch}`,
  `Production branch: ${contract.github.production_branch}`,
  `GitHub environments: ${contract.github.environments.join(", ")}`,
  "",
  "Required GitHub variables:",
  ...contract.github.required_variables.map((key) => `- ${key}`),
  "",
  "Required GitHub secrets:",
  ...contract.github.required_secrets.map((key) => `- ${key}`),
  "",
  "Tracked required files:",
  ...contract.required_files.map((filePath) => `- ${filePath}`),
  "",
  "Banned prior-project snippets:",
  ...contract.banned_identity_snippets.map((snippet) => `- ${snippet}`),
];

console.log(lines.join("\n"));
