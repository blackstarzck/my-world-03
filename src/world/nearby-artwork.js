import * as THREE from "three";

const ENTER_DISTANCE = 3;
const LEAVE_DISTANCE = 3.5;
const SWITCH_MARGIN = 0.35;

// Detect the project the visitor can actually see, rather than selecting a
// painting through a partition or the reverse face of the same panel.
export function createNearbyArtworkTracker(artworks, scene) {
  const occluders = [];
  scene.traverse((object) => {
    if (!object.isMesh) return;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    if (materials.some((material) => material && !material.transparent))
      occluders.push(object);
  });
  const ray = new THREE.Raycaster(),
    direction = new THREE.Vector3(),
    offset = new THREE.Vector3();
  let current = null;

  function unobstructed(camera, artwork, distance) {
    ray.set(camera.position, offset.set(...artwork.target).sub(camera.position).normalize());
    ray.near = 0.01;
    ray.far = Math.max(0.01, distance - 0.025);
    return !ray.intersectObjects(occluders, false).some((hit) => {
      for (let object = hit.object; object; object = object.parent)
        if (!object.visible) return false;
      const material = Array.isArray(hit.object.material)
        ? hit.object.material[hit.face.materialIndex] : hit.object.material;
      // Glass cases and transparent contact shadows do not hide the canvas.
      return material?.visible !== false && !material?.transparent;
    });
  }

  return {
    reset() { current = null; },
    update(camera, room) {
      camera.getWorldDirection(direction);
      const candidates = [];
      for (const artwork of artworks) {
        if (artwork.room !== room) continue;
        offset.set(...artwork.target).sub(camera.position);
        const distance = offset.length();
        const limit = artwork.id === current?.id ? LEAVE_DISTANCE : ENTER_DISTANCE;
        if (distance > limit || distance < 0.01) continue;
        const front = -offset.dot(new THREE.Vector3(...artwork.normal));
        if (front < 0.05 || offset.dot(direction) / distance < 0.2) continue;
        candidates.push({ artwork, distance });
      }
      candidates.sort((a, b) => a.distance - b.distance);
      const visible = candidates.filter(({ artwork, distance }) => unobstructed(camera, artwork, distance));
      const nearest = visible[0],
        previous = visible.find(({ artwork }) => artwork.id === current?.id);
      // Separate enter/leave distances and a switching margin prevent flicker
      // while walking along the boundary between two neighbouring canvases.
      current = previous && previous.distance <= (nearest?.distance ?? Infinity) + SWITCH_MARGIN
        ? previous.artwork : nearest?.artwork ?? null;
      return current;
    },
  };
}
