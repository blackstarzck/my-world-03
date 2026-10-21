import paintingAssets from "./data/painting-assets.json" with { type: "json" };
import data from "./data/portfolio.json" with { type: "json" };
import productStories from "./data/project-stories-01.json" with { type: "json" };
import systemAndLabStories from "./data/project-stories-02-03.json" with { type: "json" };

export const projectStories = { ...productStories, ...systemAndLabStories };
const verifiedTechnologies = {
  "additional:project-manager": [
    "React",
    "TypeScript",
    "Fastify",
    "SQLite",
    "IndexedDB",
    "React Flow",
    "Tiptap",
  ],
  "additional:on-the-book": [
    "JavaScript",
    "Three.js",
    "Supabase",
    "Express",
    "Vite",
  ],
};
const technologyNames = [
  "Next.js",
  "React",
  "TypeScript",
  "JavaScript",
  "Angular",
  "Ant Design",
  "Supabase",
  "PostgreSQL",
  "NestJS",
  "Python",
  "Three.js",
  "WebGL",
  "Canvas",
  "GSAP",
  "SQLite",
  "IndexedDB",
  "Fastify",
  "Express",
  "Node.js",
  "Tailwind CSS",
  "Firebase",
  "Zustand",
  "Redux",
];
function projectTechnologies(project, story) {
  if (project.skills?.length) return project.skills;
  if (verifiedTechnologies[project.sourceEntryId])
    return verifiedTechnologies[project.sourceEntryId];
  const content = JSON.stringify([
    story?.summary,
    story?.context,
    story?.contribution,
    story?.implementation,
  ]).toLowerCase();
  return technologyNames
    .filter((name) => content.includes(name.toLowerCase()))
    .slice(0, 7);
}
const displayName = (name) =>
  String(name || "")
    .replaceAll("TRIAD 전시관", "TRIAD 3D 포트폴리오")
    .replaceAll("전시관 제작 연구", "포트폴리오 구현")
    .replaceAll(" 전시관", " 3D 포트폴리오");

const roomNames = {
  "01": "제품과 사용자",
  "02": "시스템과 개발 프로세스",
  "03": "인터랙션과 실험",
};
export const portfolioRooms = data.rooms.map((room) => ({
  ...room,
  name: roomNames[room.id],
  theme: roomNames[room.id],
}));
export const portfolioExhibits = data.exhibits.map((exhibit) => {
  const projects = exhibit.projects.map((project) => {
    const story = projectStories[project.sourceEntryId];
    return {
      ...project,
      skills: projectTechnologies(project, story),
      name: displayName(project.name),
      sourceName: displayName(project.sourceName),
      ...(story
        ? { story, summary: story.summary, details: story.summary }
        : {}),
    };
  });
  const title = displayName(
    exhibit.groupId === "corp-sites"
      ? `${exhibit.shortName} 홈페이지`
      : projects.length === 1
        ? projects[0].name
        : exhibit.projectName,
  );
  return {
    ...exhibit,
    kind: "캔버스",
    artworkImage: paintingAssets[exhibit.id],
    projects,
    title,
    originalTitle: exhibit.title,
    projectName: title,
    shortName: displayName(exhibit.shortName),
    description: projects[0].summary,
    placard: projects[0].summary,
  };
});
export const findExhibit = (id) => portfolioExhibits.find((e) => e.id === id);
export const projectCount = new Set(
  portfolioExhibits.flatMap((e) => e.projects.map((p) => p.sourceEntryId)),
).size;
export function modeLabel(mode) {
  return (
    {
      iframe: "웹앱 체험",
      "local-capture": "로컬 개발 도구",
      "case-study": "개발 사례",
      "demo-preparation": "개발 프로젝트",
      "media-until-restored": "배포 정비 중",
    }[mode] || "개발 프로젝트"
  );
}
export function approvedExperienceUrl(project) {
  if (project?.mode !== "iframe" || !project.url) return null;
  try {
    const u = new URL(project.url);
    return u.protocol === "https:" && !u.username && !u.password
      ? u.href
      : null;
  } catch {
    return null;
  }
}
export function indexEntries(artworks) {
  const seen = new Set();
  return artworks.flatMap((artwork) =>
    artwork.projects
      .filter((project) => {
        if (seen.has(project.sourceEntryId)) return false;
        seen.add(project.sourceEntryId);
        return true;
      })
      .map((project) => ({ artwork, project })),
  );
}

export const posterUrl = (exhibit) => exhibit.artworkImage.gallery;
