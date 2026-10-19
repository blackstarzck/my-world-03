import design from "./design-basis.json" with { type: "json" };

export { design };
export const roomIds = ["01", "02", "03"];
export const radians = (angle) => (angle * Math.PI) / 180;
export function roomPoint(id, sideways, distance, height = 0) {
  const angle = radians(design.rooms[id].angle);
  return [
    Math.cos(angle) * (12 + distance) + Math.sin(angle) * sideways,
    height,
    -Math.sin(angle) * (12 + distance) + Math.cos(angle) * sideways,
  ];
}
export function toRoom(id, x, z) {
  const angle = radians(design.rooms[id].angle);
  return {
    t: x * Math.sin(angle) + z * Math.cos(angle),
    v: x * Math.cos(angle) - z * Math.sin(angle) - 12,
  };
}
export const lobbyArcs = [
  { center: [12 * Math.sqrt(3), 12], start: 180, end: 240 },
  { center: [0, -24], start: 60, end: 120 },
  { center: [-12 * Math.sqrt(3), 12], start: 300, end: 360 },
];
export const lobbyRadius = 12 * Math.sqrt(3) - 6;
export const atriumDetails = {
  portalRadius: 2,
  portalSpring: 2.65,
  portalDepth: 0.6,
  portalReliefDepth: 0.9,
  columnBaseRadius: 0.36,
  wallReliefDepth: 0.52,
};
export const lobbyBays = lobbyArcs.flatMap((arc, index) =>
  [12, 30, 48]
    .filter((offset) => index !== 1 || offset !== 30)
    .map((offset) => ({ center: arc.center, angle: arc.start + offset })),
);
export function lobbyOutline() {
  const points = [
    [-6, 12],
    [6, 12],
  ];
  for (let i = 0; i < 3; i++) {
    const arc = lobbyArcs[i];
    for (let step = 1; step <= 48; step++) {
      const a = radians(arc.start + ((arc.end - arc.start) * step) / 48);
      points.push([
        arc.center[0] + Math.cos(a) * lobbyRadius,
        arc.center[1] + Math.sin(a) * lobbyRadius,
      ]);
    }
    if (i < 2) {
      const p = roomPoint(i === 0 ? "03" : "02", 6, 0);
      points.push([p[0], -p[2]]);
    }
  }
  return points;
}
const outline = lobbyOutline();
export function insidePolygon(x, y, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i],
      [xj, yj] = polygon[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi)
      inside = !inside;
  }
  return inside;
}
export function currentRoom(x, z) {
  return (
    roomIds.find((id) => {
      const p = toRoom(id, x, z);
      return Math.abs(p.t) <= 6 && p.v >= 0 && p.v <= 24;
    }) || "lobby"
  );
}
export function canStand(x, z, radius = 0.26) {
  const inFloor = (X, Z) =>
    insidePolygon(X, -Z, outline) ||
    roomIds.some((id) => {
      const p = toRoom(id, X, Z);
      return Math.abs(p.t) < 6 && p.v >= -0.01 && p.v < 24;
    });
  if (
    ![
      [x + radius, z],
      [x - radius, z],
      [x, z + radius],
      [x, z - radius],
    ].every((p) => inFloor(...p))
  )
    return false;
  for (const id of roomIds) {
    const p = toRoom(id, x, z);
    if (
      p.v > -atriumDetails.portalReliefDepth - radius &&
      p.v < radius &&
      Math.abs(p.t) > 2 - radius &&
      Math.abs(p.t) < 6.3 + radius
    )
      return false;
  }
  // Relief stays close to the curved perimeter; account for its stone bases.
  for (const bay of lobbyBays) {
    const a = radians(bay.angle);
    const dx = x - bay.center[0],
      dy = -z - bay.center[1];
    const normal = dx * Math.cos(a) + dy * Math.sin(a) - lobbyRadius;
    const tangent = -dx * Math.sin(a) + dy * Math.cos(a);
    if (
      Math.abs(tangent) < 1.95 + radius &&
      normal > -0.1 - radius &&
      normal < atriumDetails.wallReliefDepth + radius
    )
      return false;
  }
  for (const o of [...design.panels, ...design.benches, ...design.cases]) {
    const p = toRoom(o.room, x, z);
    // Undo the same Y rotation used by the rendered object before collision checks.
    const angle = radians(o.rotation_y ?? 0);
    const dx = p.t - o.t,
      dv = p.v - o.v;
    const localT = Math.cos(angle) * dx + Math.sin(angle) * dv;
    const localV = -Math.sin(angle) * dx + Math.cos(angle) * dv;
    if (
      Math.abs(localT) < o.w / 2 + radius &&
      Math.abs(localV) < o.l / 2 + radius
    )
      return false;
  }
  if (Math.hypot(x, z) < 1.8 + radius) return false;
  for (const c of design.lobby.columns)
    if (Math.hypot(x - c.x, z + c.y) < atriumDetails.columnBaseRadius + radius)
      return false;
  const radial = Math.hypot(x, z),
    angle = ((Math.atan2(-z, x) * 180) / Math.PI + 360) % 360;
  if (
    radial > 4.7 - radius &&
    radial < 5.3 + radius &&
    design.lobby.benches.some(
      (b) =>
        Math.abs(((angle - b.angle + 540) % 360) - 180) <
        20 + ((radius / 5) * 180) / Math.PI,
    )
  )
    return false;
  return true;
}
export const destinations = {
  lobby: { position: [6.35, 1.75, 7.15], target: [-0.5, 1.55, -3.8] },
  "01": {
    position: roomPoint("01", 0.4, 2.5, 1.7),
    target: roomPoint("01", -1.5, 18, 1.9),
  },
  "02": {
    position: roomPoint("02", 0.35, 2.2, 1.7),
    target: roomPoint("02", -0.8, 18, 1.9),
  },
  "03": {
    position: roomPoint("03", 0.25, 1.6, 1.7),
    target: roomPoint("03", -0.4, 18, 1.8),
  },
  overview: { position: [40, 53, 50], target: [0, 0, 2] },
};
