import * as THREE from "three";

// A fixed light budget avoids compiling shaders with dozens of extra lights.
// Reuse these real spotlights for the nearest, viewer-facing exhibits.
export function createExhibitLighting(scene, targets) {
  scene.updateMatrixWorld(true);
  const exhibits = targets.map(({ object, target, source, facing }) => ({
    target: object.localToWorld(new THREE.Vector3(...target)),
    source: object.localToWorld(new THREE.Vector3(...source)),
    facing: facing
      ? new THREE.Vector3(0, 0, 1).transformDirection(object.matrixWorld)
      : null,
  }));
  const lights = Array.from({ length: Math.min(16, exhibits.length) }, () => {
    const light = new THREE.SpotLight("#ffe5be", 0, 10, 0.5, 0.7, 1.6);
    scene.add(light, light.target);
    return light;
  });
  const toViewer = new THREE.Vector3();
  const viewProjection = new THREE.Matrix4();
  const frustum = new THREE.Frustum();
  let multiplier = 1;
  let assigned = [];
  const applyIntensity = () =>
    lights.forEach((light, i) => {
      light.intensity = assigned[i] ? 34 * multiplier : 0;
    });
  return {
    update(camera) {
      camera.updateMatrixWorld();
      viewProjection.multiplyMatrices(
        camera.projectionMatrix,
        camera.matrixWorldInverse,
      );
      frustum.setFromProjectionMatrix(viewProjection);
      const ranked = exhibits
        .map((exhibit) => {
          toViewer.subVectors(camera.position, exhibit.target);
          const back = exhibit.facing && toViewer.dot(exhibit.facing) < 0;
          return {
            exhibit,
            score:
              toViewer.lengthSq() +
              (back ? 1e6 : 0) +
              (frustum.containsPoint(exhibit.target) ? 0 : 10000),
          };
        })
        .sort((a, b) => a.score - b.score);
      assigned = ranked.slice(0, lights.length).map(({ exhibit }) => exhibit);
      lights.forEach((light, i) => {
        if (!assigned[i]) return;
        light.position.copy(assigned[i].source);
        light.target.position.copy(assigned[i].target);
      });
      applyIntensity();
    },
    setIntensity(value) {
      multiplier = value;
      applyIntensity();
    },
  };
}
