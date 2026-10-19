import { canStand, design, toRoom } from "./layout.js";

// Fit the actual frame in the resized 3D viewport, including portrait screens.
export function artworkView(artwork, aspect) {
  const { target, normal, width, height } = artwork;
  const vertical = Math.tan((45 * Math.PI) / 360);
  const fit = Math.max(
    height / (2 * vertical * 0.76),
    width / (2 * vertical * aspect * 0.8),
  );
  const preferred = Math.max(artwork.kind === "조각" ? 1.6 : 1.4, fit);
  const positionAt = (distance) => [
    target[0] + normal[0] * distance,
    1.7,
    target[2] + normal[2] * distance,
  ];
  // A freestanding panel can have furniture behind the ideal viewing position.
  // Stay on its visible side and widen the lens when a closer position is needed.
  const distances = [preferred];
  for (let d = Math.min(preferred, 5); d >= 0.85; d -= 0.1) distances.push(d);
  for (let d = preferred + 0.1; d <= 5; d += 0.1) distances.push(d);
  const clearView = (distance) => {
    const position = positionAt(distance);
    if (!canStand(position[0], position[2])) return false;
    for (
      let d = artwork.kind === "조각" ? 0.85 : 0.65;
      d < distance;
      d += 0.12
    ) {
      const point = positionAt(d);
      if (!canStand(point[0], point[2], 0.08)) {
        // A bench blocks the visitor's feet, but not the eye-level view of a painting.
        const overBench = design.benches.some((bench) => {
          const local = toRoom(bench.room, point[0], point[2]);
          return (
            Math.abs(local.t - bench.t) < bench.w / 2 + 0.09 &&
            Math.abs(local.v - bench.v) < bench.l / 2 + 0.09 &&
            bench.h + 0.2 < Math.min(target[1], position[1])
          );
        });
        if (!overBench) return false;
      }
    }
    return true;
  };
  const distance = distances.find(clearView);
  if (distance === undefined)
    throw new Error(`작품 감상 위치를 찾지 못했습니다: ${artwork.id}`);
  const position = positionAt(distance);
  const delta = target.map((value, i) => value - position[i]);
  const length = Math.hypot(...delta),
    forward = delta.map((value) => value / length);
  const horizontal = Math.hypot(forward[0], forward[2]);
  const right = [-forward[2] / horizontal, 0, forward[0] / horizontal];
  const up = [
    (-forward[1] * forward[0]) / horizontal,
    horizontal,
    (-forward[1] * forward[2]) / horizontal,
  ];
  let tanHalf = vertical;
  // Fit tilted frame corners rather than counting eye-height offset as padding.
  for (const x of [-width / 2, width / 2])
    for (const y of [-height / 2, height / 2]) {
      const corner = [
        delta[0] + normal[2] * x,
        delta[1] + y,
        delta[2] - normal[0] * x,
      ];
      const dot = (axis) =>
        axis.reduce((sum, value, i) => sum + value * corner[i], 0);
      const depth = dot(forward);
      tanHalf = Math.max(
        tanHalf,
        Math.abs(dot(up)) / (depth * 0.8),
        Math.abs(dot(right)) / (depth * aspect * 0.8),
      );
    }
  return {
    position,
    target: [...target],
    fov: (2 * Math.atan(tanHalf) * 180) / Math.PI,
  };
}
