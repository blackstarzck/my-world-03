import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const read = (file) =>
  JSON.parse(fs.readFileSync(path.join(root, file), "utf8"));
const inventory = read("docs/portfolio-exhibition-inventory.json");
const plan = read("docs/portfolio-spatial-plan.json");
const legacyProjects = fs.existsSync(
  path.join(root, "src/data/legacy-projects.json"),
)
  ? read("src/data/legacy-projects.json")
  : {};
const entries = new Map(inventory.entries.map((e) => [e.id, e]));
const exhibits = plan.placements.map((p) => ({
  id: p.id,
  room: p.room,
  order: p.order,
  groupId: p.groupId,
  title: p.title,
  shortName: p.shortName,
  projectName: p.projectName,
  visualConcept: p.visualConcept,
  placard: p.placard,
  description: p.lead,
  lookFor: p.lookFor,
  role: p.role,
  scope: p.scope,
  kind: p.kind === "case" ? "입체 작품" : "회화",
  slotKind: p.kind,
  projects: p.projects.map((project) => {
    const original = entries.get(project.sourceEntryId || project.id);
    return {
      id: project.id,
      name: project.name,
      repositories: project.repositories,
      mode: project.mode,
      url: project.url,
      optionalDemos: project.optionalDemos || [],
      ...(legacyProjects[project.sourceEntryId || project.id] || {}),
      sourceEntryId: project.sourceEntryId || project.id,
      sourceName: original.name,
      summary: original.summary,
      repoUrls: original.repoUrls,
      deployments: original.deployments.map((d) => ({
        url: d.url,
        httpStatus: d.httpStatus,
      })),
    };
  }),
}));
fs.mkdirSync(path.join(root, "src/data"), { recursive: true });
fs.writeFileSync(
  path.join(root, "src/data/portfolio.json"),
  JSON.stringify(
    {
      checkedOn: plan.checkedOn,
      rooms: plan.rooms.map((r) => ({
        id: r.id,
        name: r.name,
        theme: r.theme,
        intro: r.intro,
        flow: r.flow,
      })),
      exhibits,
    },
    null,
    2,
  ) + "\n",
);
console.log(
  `Synced ${exhibits.length} exhibits / ${new Set(exhibits.flatMap((e) => e.projects.map((p) => p.sourceEntryId))).size} project entries.`,
);
