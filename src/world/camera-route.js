import { canStand } from "./layout.js";

const distance = (a, b) => Math.hypot(...a.map((value, i) => value - b[i]));
const blend = (a, b, t) => a.map((value, i) => value + (b[i] - value) * t);

export function clearSegment(a, b) {
  if (!canStand(a[0], a[2]) || !canStand(b[0], b[2])) return false;
  const length = Math.hypot(b[0] - a[0], b[2] - a[2]);
  function clear(start, end) {
    const halfSpan = length * (end - start) / 2;
    const midpoint = blend(a, b, (start + end) / 2);
    if (!canStand(midpoint[0], midpoint[2])) return false;
    // Certify the whole interval, rather than missing a thin corner between samples.
    if (canStand(midpoint[0], midpoint[2], 0.26 + halfSpan)) return true;
    // Reject interior grazes instead of spending thousands of subdivisions on
    // paths with almost zero clearance. Refine endpoint intervals so a visitor
    // already standing close to a wall can still move away safely.
    if (halfSpan < 0.005 && start > 0 && end < 1) return false;
    if (halfSpan < 0.00001) return false;
    const middle = (start + end) / 2;
    return clear(start, middle) && clear(middle, end);
  }
  return clear(0, 1);
}

// Cache the static floor grid. A* follows the same walls, portals and furniture
// as walking, including the rotated exhibition panels.
const step = 0.6,
  origin = -38,
  size = 128;
const nodes = new Map(),
  links = new Map();
function node(x, z) {
  if (x < 0 || z < 0 || x >= size || z >= size) return null;
  const id = x * size + z;
  if (!nodes.has(id)) {
    const point = [origin + x * step, 1.7, origin + z * step];
    nodes.set(id, canStand(point[0], point[2]) ? { id, x, z, point } : null);
  }
  return nodes.get(id);
}
function neighbours(current) {
  if (!links.has(current.id)) {
    const result = [];
    for (let dx = -1; dx <= 1; dx++)
      for (let dz = -1; dz <= 1; dz++) {
        if (!dx && !dz) continue;
        const next = node(current.x + dx, current.z + dz);
        if (next && clearSegment(current.point, next.point)) result.push(next);
      }
    links.set(current.id, result);
  }
  return links.get(current.id);
}
function connections(point) {
  const x = Math.round((point[0] - origin) / step),
    z = Math.round((point[2] - origin) / step);
  const result = [];
  for (let dx = -2; dx <= 2; dx++)
    for (let dz = -2; dz <= 2; dz++) {
      const candidate = node(x + dx, z + dz);
      if (candidate && clearSegment(point, candidate.point))
        result.push(candidate);
    }
  return result
    .sort((a, b) => distance(a.point, point) - distance(b.point, point))
    .slice(0, 8);
}
class Queue {
  items = [];
  push(item) {
    let i = this.items.length;
    this.items.push(item);
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.items[parent].score <= item.score) break;
      this.items[i] = this.items[parent];
      i = parent;
    }
    this.items[i] = item;
  }
  pop() {
    const first = this.items[0],
      last = this.items.pop();
    if (this.items.length) {
      let i = 0;
      while (i * 2 + 1 < this.items.length) {
        let child = i * 2 + 1;
        if (
          child + 1 < this.items.length &&
          this.items[child + 1].score < this.items[child].score
        )
          child++;
        if (last.score <= this.items[child].score) break;
        this.items[i] = this.items[child];
        i = child;
      }
      this.items[i] = last;
    }
    return first;
  }
}

export function planRoute(from, to) {
  if (clearSegment(from, to)) return [from, to];
  const starts = connections(from),
    ends = connections(to),
    goal = new Set(ends.map((n) => n.id));
  const costs = new Map(),
    previous = new Map(),
    queue = new Queue();
  for (const start of starts) {
    const cost = distance(from, start.point);
    costs.set(start.id, cost);
    queue.push({ node: start, cost, score: cost + distance(start.point, to) });
  }
  let end;
  while (queue.items.length) {
    const item = queue.pop(),
      current = item.node;
    if (item.cost !== costs.get(current.id)) continue;
    if (goal.has(current.id)) {
      end = current;
      break;
    }
    for (const next of neighbours(current)) {
      const cost = item.cost + distance(current.point, next.point);
      if (cost >= (costs.get(next.id) ?? Infinity)) continue;
      costs.set(next.id, cost);
      previous.set(next.id, current);
      queue.push({ node: next, cost, score: cost + distance(next.point, to) });
    }
  }
  if (!end) throw new Error("전시실까지 이어지는 관람 경로를 찾지 못했습니다.");
  const route = [to];
  for (let at = end; at; at = previous.get(at.id)) route.unshift(at.point);
  route.unshift(from);
  const short = [from];
  for (let i = 0; i < route.length - 1; ) {
    let j = route.length - 1;
    while (j > i + 1 && !clearSegment(route[i], route[j])) j--;
    if (distance(short.at(-1), route[j]) > 0.001) short.push(route[j]);
    i = j;
  }
  return roundRoute(short);
}

function roundRoute(points) {
  const result = [points[0]];
  for (let i = 1; i < points.length - 1; i++) {
    const a = points[i - 1],
      b = points[i],
      c = points[i + 1];
    let curve;
    for (
      let radius = Math.min(3, distance(a, b) * 0.4, distance(b, c) * 0.4);
      radius > 0.08;
      radius *= 0.6
    ) {
      const start = blend(b, a, radius / distance(a, b)),
        end = blend(b, c, radius / distance(b, c));
      const count = Math.max(12, Math.ceil((radius * 2) / 0.08));
      const candidate = Array.from({ length: count + 1 }, (_, j) => {
        const t = j / count;
        return blend(blend(start, b, t), blend(b, end, t), t);
      });
      if (
        candidate.every((p, j) =>
          clearSegment(j ? candidate[j - 1] : result.at(-1), p),
        ) &&
        clearSegment(candidate.at(-1), c)
      ) {
        curve = candidate;
        break;
      }
    }
    result.push(...(curve ?? [b]));
  }
  result.push(points.at(-1));
  return result;
}

export function routeMetrics(points) {
  let total = 0;
  const distances = [0];
  for (let i = 1; i < points.length; i++) {
    total += distance(points[i - 1], points[i]);
    distances.push(total);
  }
  return { total, distances };
}
export function sampleRoute(points, metrics, t) {
  const d = Math.max(0, Math.min(1, t)) * metrics.total;
  let low = 0,
    high = metrics.distances.length - 1;
  while (low < high) {
    const middle = (low + high) >> 1;
    if (metrics.distances[middle] >= d) high = middle;
    else low = middle + 1;
  }
  if (!low) return [...points[0]];
  const start = metrics.distances[low - 1];
  return blend(
    points[low - 1],
    points[low],
    (d - start) / (metrics.distances[low] - start || 1),
  );
}
