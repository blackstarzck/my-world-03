import { artworkView, fitArtworkView } from "./artwork-view.js";
import { clearSegment, planRoute, routeMetrics } from "./camera-route.js";
import { createCameraMotion, createFramingMotion } from "./camera-motion.js";

export function artworkApproach(from, artwork, aspect) {
  const to = artworkView(artwork, aspect);
  const offset = from.position.map((value, i) => value - artwork.target[i]);
  const depth = offset.reduce((sum, value, i) => sum + value * artwork.normal[i], 0);
  const lateral = Math.hypot(...offset.map((value, i) =>
    i === 1 ? 0 : value - artwork.normal[i] * depth));
  const gaze = from.target.map((value, i) => value - from.position[i]);
  const alignment = -gaze.reduce((sum, value, i) => sum + value * offset[i], 0) /
    (Math.hypot(...gaze) * Math.hypot(...offset) || 1);
  const viewingDepth = Math.hypot(...to.position.map((value, i) => value - artwork.target[i]));
  const nearby = depth > 0 && depth <= Math.min(3.2, viewingDepth + 0.75) &&
    lateral <= Math.max(1.25, artwork.width * 0.9) &&
    Math.abs(offset[1]) < 0.9 && alignment > 0.25;
  if (nearby && clearSegment(from.position, to.position))
    return createFramingMotion(from, to, artwork.target);
  if (nearby) {
    // A bench can sit between a near visitor and the ideal framing distance.
    // Stop on this side of it and fit the entire painting with a wider lens,
    // rather than walking all the way around furniture for a small adjustment.
    for (let distance = viewingDepth - 0.1; distance >= Math.max(0.75, depth); distance -= 0.1) {
      const position = artwork.target.map((value, i) => value + artwork.normal[i] * distance);
      const candidate = fitArtworkView(artwork, aspect, position);
      if (candidate.fov < 145 && clearSegment(from.position, position))
        return createFramingMotion(from, candidate, artwork.target);
    }
  }
  return createCameraMotion(planRoute(from.position, to.position), from.target,
    to.target, from.fov, to.fov);
}

export function returnMotion(from, to) {
  const distance = Math.hypot(...to.position.map((value, i) => value - from.position[i]));
  if (distance <= 6 && clearSegment(from.position, to.position))
    return createFramingMotion(from, to);
  const route = planRoute(from.position, to.position);
  if (distance <= 6 && routeMetrics(route).total <= 8)
    return createFramingMotion(from, to, null, route);
  return createCameraMotion(route, from.target,
    to.target, from.fov, to.fov, true);
}
