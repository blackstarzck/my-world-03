import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const source = "https://raw.githubusercontent.com/blackstarzck/my-website-2026/main/chanki-react/data/nodes.ts";
const inventory = JSON.parse(fs.readFileSync(path.join(root, "docs/portfolio-exhibition-inventory.json"), "utf8"));
const response = await fetch(source);
if (!response.ok) throw new Error(`Project metadata: ${response.status}`);
const raw = await response.text();
const nodes = JSON.parse(raw.slice(raw.indexOf("= [") + 2).trim());
const projects = {};
for (const entry of inventory.entries) {
  const node = nodes.find((item) => item.id === entry.sourceNodeId);
  const card = node?.cards?.find((item) =>
    entry.repos.includes(item.repo) || item.repo === entry.name || entry.repoUrls.includes(item.code),
  );
  if (card?.desc || card?.skills?.length) {
    projects[entry.id] = { details: card.desc || null, skills: card.skills || [] };
  }
}
fs.writeFileSync(path.join(root, "src/data/legacy-projects.json"), JSON.stringify(projects, null, 2) + "\n");
console.log(`Imported text and technology metadata for ${Object.keys(projects).length} project entries.`);
