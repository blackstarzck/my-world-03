import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { blackHoleOrientation, blackHoleReference, restoreBlackHoleMaterials } from "./black-hole-materials.js";
import { loadBlackHoleEnvironment } from "./black-hole-environment.js";
import { loadCompressedAsset } from "./compressed-asset.js";

export const centralExhibit = {
  diameter: 3.2,
  height: 1.75,
  yaw: -Math.PI / 2,
};

export async function loadCentralExhibit(manager, { restoreMaterials = restoreBlackHoleMaterials } = {}) {
  const [{ scene, parser }, spaceEnvironment] = await Promise.all([
    loadCompressedAsset("/assets/black_hole.optimized.glb.gz", manager)
      .then(bytes => new GLTFLoader(manager).parseAsync(bytes, "/assets/")),
    loadBlackHoleEnvironment(manager),
  ]);
  const exhibit = new THREE.Group();
  exhibit.name = "Black Hole";
  exhibit.userData.spaceEnvironment = spaceEnvironment;
  exhibit.quaternion.copy(blackHoleOrientation(new THREE.Vector3(3, 0, 8)));
  exhibit.add(scene);

  // Keep the authored tilt, with the center on the visitor's horizontal sightline.
  const bounds = new THREE.Box3().setFromObject(scene, true);
  const size = bounds.getSize(new THREE.Vector3());
  const scale = centralExhibit.diameter / Math.max(size.x, size.y, size.z);
  exhibit.userData.refractionRadius = size.length() * 0.5 * scale;
  const center = bounds.getCenter(new THREE.Vector3());
  scene.scale.multiplyScalar(scale);
  scene.position.sub(center.multiplyScalar(scale));
  exhibit.position.y = centralExhibit.height;
  await restoreMaterials(scene, parser);
  const point = blackHoleReference.lighting.lights.find((light) => light.enable && light.type === "POINT");
  const nativeLight = new THREE.Vector3().setFromMatrixPosition(new THREE.Matrix4().fromArray(point.matrix))
    .applyMatrix4(new THREE.Matrix4().fromArray(blackHoleReference.orientation.matrix));
  const localLight = new THREE.Vector3(nativeLight.x, nativeLight.z, -nativeLight.y)
    .multiplyScalar(scale).add(scene.position);
  const worldScale = new THREE.Vector3();
  const environmentBasis = new THREE.Matrix4().makeRotationZ(-blackHoleReference.environment.rotation)
    .multiply(new THREE.Matrix4().fromArray(blackHoleReference.orientation.matrix).invert())
    .multiply(new THREE.Matrix4().makeRotationX(Math.PI / 2));
  const environmentMatrix = new THREE.Matrix4();
  const nativeFocus = new THREE.Vector3().fromArray(blackHoleReference.postProcess.dof.focusPoint)
    .applyMatrix4(new THREE.Matrix4().fromArray(blackHoleReference.orientation.matrix));
  exhibit.userData.focusPoint = new THREE.Vector3(nativeFocus.x, nativeFocus.z, -nativeFocus.y)
    .multiplyScalar(scale).add(scene.position);

  scene.traverse((object) => {
    if (!object.isMesh) return;
    // Effect shells must not cast solid disk shadows or write depth over
    // another transparent shell. The plinth keeps its own physical shadow.
    object.castShadow = false;
    object.receiveShadow = false;
    // The source's own light is part of the exhibit, so the room fade must
    // not extinguish its reflected ribbons. Evaluate it only on these meshes.
    object.onBeforeRender = (renderer, world, camera) => {
      const uniforms = object.material.userData.blackHoleSurface;
      if (!uniforms) return;
      uniforms.sourceLightPosition.value.copy(localLight).applyMatrix4(exhibit.matrixWorld)
        .applyMatrix4(camera.matrixWorldInverse);
      uniforms.sourceLightColor.value.fromArray(point.color).multiplyScalar(point.intensity);
      exhibit.getWorldScale(worldScale);
      uniforms.sourceLightFalloff.value = point.falloff / (scale * worldScale.x) ** 2;
      uniforms.sourceEnvironment.value = spaceEnvironment;
      environmentMatrix.copy(exhibit.matrixWorld).invert();
      uniforms.sourceEnvironmentTransform.value.setFromMatrix4(environmentMatrix.premultiply(environmentBasis));
    };
    for (const material of Array.isArray(object.material)
      ? object.material
      : [object.material]) {
      if (material.map) material.map.anisotropy = 8;
    }
  });
  return exhibit;
}
