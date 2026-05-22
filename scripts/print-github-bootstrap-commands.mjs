import fs from "node:fs";
import path from "node:path";

const rootDir = path.resolve(import.meta.dirname, "..");
const contract = JSON.parse(
  fs.readFileSync(path.join(rootDir, "config/boilerplate-contract.json"), "utf8")
);

const branchProtection = JSON.parse(
  fs.readFileSync(path.join(rootDir, "config/github-branch-protection.template.json"), "utf8")
);

const envTemplate = JSON.parse(
  fs.readFileSync(path.join(rootDir, "config/github-environments.template.json"), "utf8")
);

const statusChecks = JSON.stringify(branchProtection.main.required_status_checks);
const envNames = contract.github.environments.join(", ");

const lines = [
  "GitHub bootstrap commands",
  "",
  "Prereq:",
  "- gh auth login",
  "- gh repo set-default <owner/repo>",
  "",
  `Expected GitHub environments: ${envNames}`,
  "",
  "Create environments in GitHub UI or via API if your org permits it.",
  "",
  "Suggested branch protection commands:",
  `gh api -X PUT repos/<owner>/<repo>/branches/${contract.github.staging_branch}/protection --input config/github-branch-protection.template.json`,
  `gh api -X PUT repos/<owner>/<repo>/branches/${contract.github.production_branch}/protection --input config/github-branch-protection.template.json`,
  "",
  `Required status checks: ${statusChecks}`,
  "",
  "Set environment variables and secrets from:",
  "- config/github-environments.template.json",
  "- config/boilerplate-contract.json",
  "",
  "Then push branches:",
  `git push origin ${contract.github.staging_branch}`,
  `git push origin ${contract.github.production_branch}`,
  "",
  "Verify after push:",
  `- ${contract.github.staging_branch} triggers staging deploy`,
  `- ${contract.github.production_branch} triggers production deploy`,
  "",
  "Staging variable example:",
  JSON.stringify(envTemplate.staging.variables, null, 2),
  "",
  "Production variable example:",
  JSON.stringify(envTemplate.production.variables, null, 2),
];

console.log(lines.join("\n"));
