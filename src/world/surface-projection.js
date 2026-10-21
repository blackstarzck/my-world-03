import * as THREE from "three";

// Project a real artwork plane into CSS pixels without reading iframe contents.
export function surfaceProjection(artwork, camera, viewport) {
  const center = new THREE.Vector3(...artwork.target),
    normal = new THREE.Vector3(...artwork.normal).normalize();
  if (normal.dot(camera.position.clone().sub(center)) <= 0) return null;
  const up = new THREE.Vector3(0, 1, 0),
    right = up.clone().cross(normal).normalize();
  const points = [
    [-1, 1],
    [1, 1],
    [1, -1],
    [-1, -1],
  ].map(([x, y]) =>
    center
      .clone()
      .addScaledVector(right, (x * artwork.width) / 2)
      .addScaledVector(up, (y * artwork.height) / 2)
      .project(camera),
  );
  if (points.some((p) => !Number.isFinite(p.x) || p.z < -1 || p.z > 1))
    return null;
  const corners = points.map((p) => [
    ((p.x + 1) * viewport.width) / 2,
    ((1 - p.y) * viewport.height) / 2,
  ]);
  const distance = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  const width = Math.max(
    1,
    Math.round(
      (distance(corners[0], corners[1]) + distance(corners[2], corners[3])) / 2,
    ),
  );
  const height = Math.max(
    1,
    Math.round(
      (distance(corners[0], corners[3]) + distance(corners[1], corners[2])) / 2,
    ),
  );
  const matrix = quadTransform(corners, width, height);
  return matrix ? { width, height, matrix, corners } : null;
}
export function quadTransform(corners, width, height) {
  const rows = [];
  [
    [0, 0],
    [1, 0],
    [1, 1],
    [0, 1],
  ].forEach(([x, y], i) => {
    const [u, v] = corners[i];
    rows.push(
      [x, y, 1, 0, 0, 0, -u * x, -u * y, u],
      [0, 0, 0, x, y, 1, -v * x, -v * y, v],
    );
  });
  for (let col = 0; col < 8; col++) {
    let pivot = col;
    for (let row = col + 1; row < 8; row++)
      if (Math.abs(rows[row][col]) > Math.abs(rows[pivot][col])) pivot = row;
    if (Math.abs(rows[pivot][col]) < 1e-10) return null;
    [rows[col], rows[pivot]] = [rows[pivot], rows[col]];
    const div = rows[col][col];
    for (let j = col; j < 9; j++) rows[col][j] /= div;
    for (let row = 0; row < 8; row++) {
      if (row === col) continue;
      const factor = rows[row][col];
      for (let j = col; j < 9; j++) rows[row][j] -= factor * rows[col][j];
    }
  }
  const [a, b, c, d, e, f, g, h] = rows.map((r) => r[8]);
  return [
    a / width,
    d / width,
    0,
    g / width,
    b / height,
    e / height,
    0,
    h / height,
    0,
    0,
    1,
    0,
    c,
    f,
    0,
    1,
  ];
}
