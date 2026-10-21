import * as THREE from "three";
import { BlackHoleNativeRenderer } from "./black-hole-native-renderer.js";
import { blackHoleInteraction } from "./black-hole-motion.js";

// Keep the authored narrow-lens perspective while visitors use a normal
// walking camera. An off-axis lens preserves the exhibit's screen position.
export function updateBlackHoleCamera(camera, viewer, center, magnification = 1, modelRadius = 2.3) {
  const lensRatio = Math.tan(THREE.MathUtils.degToRad(viewer.fov / 2))
    / Math.tan(THREE.MathUtils.degToRad(6 / 2));
  const ratio = lensRatio / magnification;
  camera.copy(viewer, false);
  camera.fov = 6;
  camera.position.copy(viewer.position).sub(center).multiplyScalar(ratio).add(center);
  camera.updateMatrixWorld(true);
  const depth = -center.clone().applyMatrix4(camera.matrixWorldInverse).z;
  camera.near = Math.max(.005, depth - modelRadius * 1.1);
  camera.far = Math.max(camera.near + .01, depth + modelRadius * 1.1);
  camera.updateProjectionMatrix();
  const projected = center.clone().project(viewer);
  camera.projectionMatrix.elements[8] += (lensRatio - 1) * projected.x;
  camera.projectionMatrix.elements[9] += (lensRatio - 1) * projected.y;
  camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
  return ratio;
}

export function createBlackHoleBloom(exhibit, viewer) {
  const camera = new THREE.PerspectiveCamera();
  const pass = new BlackHoleNativeRenderer(exhibit, camera);
  const selectionRay = new THREE.Raycaster();
  const selectable = pass.sources.map(({ source }) => source).filter(source =>
    !source.material.userData.blackHoleOptics || source.material.name === "black_hole_center");
  const center = new THREE.Vector3(), viewCenter = new THREE.Vector3();
  const forward = new THREE.Vector3(), toModel = new THREE.Vector3();
  const fallback = [];
  // The full optical stack renders in isolation; a cheap texture-only view is
  // enough for overhead plans and exhibits seen from distant rooms.
  for (const { source } of pass.sources) {
    source.visible = false;
    const original = source.material;
    if (original.userData.blackHoleOptics && original.name !== "black_hole_center") continue;
    const core = original.name === "black_hole_center";
    const material = new THREE.MeshBasicMaterial({
      name: "black-hole-distant", color: core ? 0 : 0xffffff,
      map: core ? null : original.map,
      alphaMap: core ? null : original.alphaMap,
      alphaTest: core ? 0 : original.alphaTest,
      transparent: !core, opacity: core ? 1 : Math.min(1, original.opacity),
      blending: core ? THREE.NormalBlending : THREE.AdditiveBlending,
      depthWrite: core, toneMapped: false,
    });
    material.onBeforeCompile = shader => {
      shader.fragmentShader = shader.fragmentShader.replace("#include <alphamap_fragment>",
        "#ifdef USE_ALPHAMAP\n diffuseColor.a *= texture2D(alphaMap, vAlphaMapUv).a;\n #endif");
    };
    material.customProgramCacheKey = () => "black-hole-distant-alpha";
    const mesh = new THREE.Mesh(source.geometry, material);
    mesh.position.copy(source.position); mesh.quaternion.copy(source.quaternion); mesh.scale.copy(source.scale);
    source.parent.add(mesh);
    fallback.push(mesh);
  }
  const uniforms = {
    blackHoleLight: { value: pass.finished.texture },
    blackHoleDepth: { value: pass.depth.target.depthTexture },
    galleryDepth: { value: null },
    blackHoleEnabled: { value: 0 }, immersion: { value: 0 },
    galleryNearFar: { value: new THREE.Vector2() }, opticalNearFar: { value: new THREE.Vector2() },
    centerDepth: { value: 1 }, opticalDepthOffset: { value: 0 },
  };
  return {
    pass,
    hitTest(point) {
      if (!pass.enabled) return false;
      exhibit.getWorldPosition(center);
      if (Math.hypot(viewer.position.x - center.x, viewer.position.z - center.z)
          > blackHoleInteraction.clickDistance) return false;
      // Pick with the same lens that displays the enlarged black hole.
      selectionRay.setFromCamera(point, camera);
      return selectionRay.intersectObjects(selectable, false).length > 0;
    },
    get immersion() { return pass.enabled ? uniforms.immersion.value : 0; },
    diagnostics: () => ({ immersion: +uniforms.immersion.value.toFixed(3), nativeWidth: pass.finished.width }),
    attachOutput(output) {
      Object.assign(output.uniforms, uniforms);
      output.material.fragmentShader = output.material.fragmentShader.replace(
        "uniform sampler2D tDiffuse;",
        `uniform sampler2D tDiffuse, blackHoleLight, blackHoleDepth, galleryDepth;
        uniform float blackHoleEnabled, immersion, centerDepth, opticalDepthOffset;
        uniform vec2 galleryNearFar, opticalNearFar;
        float distanceFromDepth(float depth, vec2 nf) {
          return nf.x * nf.y / (nf.y - depth * (nf.y - nf.x));
        }`,
      ).replace("// color space", `
        if (blackHoleEnabled > .5) {
          vec4 light = texture2D(blackHoleLight, vUv);
          float modelZ = texture2D(blackHoleDepth, vUv).r;
          float modelDistance = modelZ < .999999
            ? distanceFromDepth(modelZ, opticalNearFar) - opticalDepthOffset : centerDepth;
          float wallDistance = distanceFromDepth(texture2D(galleryDepth, vUv).r, galleryNearFar);
          float visible = smoothstep(-.02, .03, wallDistance - modelDistance);
          gl_FragColor.rgb *= (1.0 - immersion) * (1.0 - light.a * visible);
          gl_FragColor.rgb += light.rgb * visible;
        }
        // color space`);
      output.material.needsUpdate = true;
    },
    setDepthTexture(texture) { uniforms.galleryDepth.value = texture; },
    resize(width, height, pixelRatio, nextQuality) {
      pass.setSize(Math.max(1, Math.round(width * pixelRatio)), Math.max(1, Math.round(height * pixelRatio)));
      const samples = nextQuality === "high" ? 2 : 0;
      for (const target of [pass.model, pass.capture.target]) {
        if (target.samples !== samples) { target.dispose(); target.samples = samples; }
      }
      // The surface remains full resolution; only the soft halo is cheaper.
      pass.setHaloSize(width * pixelRatio * .75, height * pixelRatio * .75);
    },
    update(activation, overview) {
      exhibit.updateWorldMatrix(true, true);
      viewer.updateMatrixWorld(true);
      exhibit.getWorldPosition(center);
      viewer.getWorldDirection(forward);
      toModel.copy(center).sub(viewer.position);
      pass.enabled = !overview && toModel.length() < 22 && forward.dot(toModel.normalize()) > .1;
      for (const mesh of fallback) mesh.visible = !pass.enabled;
      uniforms.blackHoleEnabled.value = Number(pass.enabled);
      uniforms.immersion.value = THREE.MathUtils.smoothstep(activation, .55, .97);
      if (!pass.enabled) return;
      const magnification = 1 + .8 * THREE.MathUtils.smoothstep(activation, .12, 1);
      const radius = (exhibit.userData.refractionRadius ?? 2.3) * exhibit.scale.x;
      const ratio = updateBlackHoleCamera(camera, viewer, center, magnification, radius);
      viewCenter.copy(center).applyMatrix4(viewer.matrixWorldInverse);
      uniforms.centerDepth.value = -viewCenter.z;
      uniforms.opticalDepthOffset.value = (ratio - 1) * -viewCenter.z;
      uniforms.galleryNearFar.value.set(viewer.near, viewer.far);
      uniforms.opticalNearFar.value.set(camera.near, camera.far);
    },
  };
}
