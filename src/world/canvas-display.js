export const CANVAS_ASPECT = 7 / 5;
export const CANVAS_DEPTH = 0.03;
export function canvasDimensions(slotKind, endWall = false) {
  const width = slotKind === "case" ? 1.02 : endWall ? 2.25 : 1.65;
  return { width, height: width / CANVAS_ASPECT, depth: CANVAS_DEPTH };
}
