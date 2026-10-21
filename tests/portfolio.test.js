import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import {
  portfolioExhibits,
  indexEntries,
  approvedExperienceUrl,
  projectStories,
} from "../src/portfolio.js";
import {
  quadTransform,
  surfaceProjection,
} from "../src/world/surface-projection.js";

test("every project has an individual developer case with implementation evidence", () => {
  const entries = indexEntries(portfolioExhibits);
  assert.deepEqual(
    new Set(Object.keys(projectStories)),
    new Set(entries.map(({ project }) => project.sourceEntryId)),
  );
  const summaries = new Set();
  for (const { project } of entries) {
    const story = project.story;
    assert(story.summary.length > 35, project.name);
    summaries.add(story.summary);
    assert(story.context.length > 20, project.name);
    assert(Array.isArray(story.contribution), project.name);
    assert(story.implementation.length > 0, project.name);
    assert(story.evidence.length > 0, project.name);
    for (const item of story.implementation) {
      assert(item.title && item.body.length > 25, project.name);
    }
    assert.doesNotMatch(
      JSON.stringify(story),
      /작품에 대하여|관람 포인트|연작에 대하여|도서 4권 표시와 상세 이동을 확인/,
    );
  }
  assert.equal(summaries.size, entries.length);
});

test("approved physical assignments cover every project and preserve empty panel faces", () => {
  const entries = indexEntries(portfolioExhibits);
  assert.equal(portfolioExhibits.length, 49);
  assert.equal(entries.length, 95);
  assert.equal(new Set(portfolioExhibits.map((e) => e.id)).size, 49);
  assert.deepEqual(
    ["01", "02", "03"].map(
      (id) => portfolioExhibits.filter((e) => e.room === id).length,
    ),
    [19, 14, 16],
  );
  assert.equal(
    portfolioExhibits.filter((e) => e.room === "02" && e.slotKind === "panel")
      .length,
    3,
  );
  assert.equal(
    portfolioExhibits.find((e) => e.id === "A03-END").projects.length,
    26,
  );
  assert.equal(
    portfolioExhibits.find((e) => e.id === "V08").projects[0].mode,
    "demo-preparation",
  );
  assert.equal(
    portfolioExhibits.find((e) => e.id === "V09").projects[0].mode,
    "iframe",
  );
  for (const exhibit of portfolioExhibits)
    for (const project of exhibit.projects) {
      assert(!("captures" in project), project.name);
      assert(!("materials" in project), project.name);
    }
});
test("project descriptions and technologies survive removal of screen materials", () => {
  const react = portfolioExhibits.find((e) => e.id === "A03-END");
  const todos = react.projects.find((p) =>
    p.repositories.includes("react-todos"),
  );
  const first = react.projects.find((p) =>
    p.repositories.includes("react-practice1"),
  );
  assert(todos.story.implementation.length > 0);
  assert(first.skills.length > 0);
  assert.match(first.details, /라우터/);
});
test("live embeds require an explicitly eligible project and an HTTPS address", () => {
  assert.equal(
    approvedExperienceUrl({ mode: "case-study", url: "https://example.com" }),
    null,
  );
  for (const url of [
    "javascript:alert(1)",
    "data:text/html,x",
    "http://example.com",
    "https://user:password@example.com",
  ])
    assert.equal(approvedExperienceUrl({ mode: "iframe", url }), null);
  for (const exhibit of portfolioExhibits)
    for (const p of exhibit.projects)
      if (p.mode === "iframe") assert(approvedExperienceUrl(p), p.name);
});
test("CSS homography maps all four iframe corners to the actual perspective quad", () => {
  const corners = [
      [40, 25],
      [730, 48],
      [685, 540],
      [60, 490],
    ],
    width = 700,
    height = 500,
    m = quadTransform(corners, width, height);
  [
    [0, 0],
    [width, 0],
    [width, height],
    [0, height],
  ].forEach(([x, y], i) => {
    const denominator = m[3] * x + m[7] * y + m[15];
    assert(
      Math.abs((m[0] * x + m[4] * y + m[12]) / denominator - corners[i][0]) <
        1e-6,
    );
    assert(
      Math.abs((m[1] * x + m[5] * y + m[13]) / denominator - corners[i][1]) <
        1e-6,
    );
  });
  assert.equal(
    quadTransform(
      [
        [0, 0],
        [0, 0],
        [0, 0],
        [0, 0],
      ],
      100,
      100,
    ),
    null,
  );
});
test("projected surfaces track resized viewports and hide their back face", () => {
  const camera = new THREE.PerspectiveCamera(45, 1.4, 0.1, 100);
  camera.position.set(0, 1.7, 4);
  camera.lookAt(0, 1.5, 0);
  camera.updateMatrixWorld();
  const artwork = {
    target: [0, 1.5, 0],
    normal: [0, 0, 1],
    width: 1.4,
    height: 1,
  };
  const first = surfaceProjection(artwork, camera, {
    width: 1400,
    height: 1000,
  });
  assert(first && first.matrix.every(Number.isFinite));
  const next = surfaceProjection(artwork, camera, { width: 700, height: 500 });
  assert(Math.abs(next.width - first.width / 2) <= 1);
  assert.equal(
    surfaceProjection({ ...artwork, normal: [0, 0, -1] }, camera, {
      width: 700,
      height: 500,
    }),
    null,
  );
});
