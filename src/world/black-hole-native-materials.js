import * as THREE from "three";
import { configureBlackHoleShader } from "./black-hole-native-optics.js";
import reference from "./black-hole-reference.json" with { type: "json" };

export { reference as blackHoleReference };

// Restore channels omitted by Sketchfab's GLB export, using the authored
// values from its public viewer settings rather than recoloring the atlases.
export async function restoreBlackHoleNativeMaterials(scene, parser) {
  const originals = new Set();
  scene.traverse((object) => {
    if (object.isMesh) originals.add(object.material);
  });
  const textures = new Map();
  const texture = async (channel, color = false) => {
    if (!channel?.texture) return null;
    const { index, component, channel: uv } = channel.texture;
    const key = JSON.stringify([index, component, uv, channel.transform, color]);
    if (!textures.has(key)) textures.set(key, (async () => {
      const source = await parser.getDependency("texture", index);
      const result = source.clone();
      result.channel = uv;
      result.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace;
      result.wrapS = result.wrapT = THREE.RepeatWrapping;
      result.repeat.fromArray(channel.transform?.scale ?? [1, 1]);
      result.offset.fromArray(channel.transform?.offset ?? [0, 0]);
      // The GLB export flips the source V coordinate. Conjugate the viewer's
      // transform into that basis, including the fractional optical offset.
      result.offset.y = 1 - result.repeat.y - result.offset.y;
      result.rotation = channel.transform?.rotation ?? 0;
      result.updateMatrix();
      result.anisotropy = 8;
      result.needsUpdate = true;
      return result;
    })());
    return textures.get(key);
  };
  const replacements = new Map();
  await Promise.all([...originals].map(async (original) => {
    const settings = reference.materials[original.name];
    if (!settings) return;
    const { DiffusePBR: diffuse, SpecularPBR: specular, GlossinessPBR: gloss,
      EmitColor: emission, BumpMap: bump, Opacity: opacity } = settings;
    const refractive = opacity.enable && opacity.type === "refraction";
    const material = new THREE.MeshPhysicalMaterial({
      name: original.name,
      map: await texture(diffuse, true),
      color: new THREE.Color().fromArray(diffuse.color ?? [1, 1, 1])
        .multiplyScalar(diffuse.factor),
      metalness: 0,
      roughness: 1 - gloss.factor,
      alphaTest: settings.AlphaMask.enable ? settings.AlphaMask.factor : 0,
      alphaToCoverage: settings.AlphaMask.enable,
      transparent: opacity.enable && opacity.type === "alphaBlend",
      opacity: opacity.enable && opacity.type === "alphaBlend" ? opacity.factor : 1,
      side: THREE.FrontSide,
    });
    material.userData.sketchfab = settings;
    if (emission.enable) {
      material.emissive.setRGB(1, 1, 1);
      material.emissiveIntensity = emission.factor;
      material.emissiveMap = await texture(emission, true);
    }
    if (bump.enable && bump.texture) {
      material.bumpMap = await texture(bump);
      material.bumpScale = bump.factor;
    }
    if (gloss.texture) {
      material.roughness = 1;
      material.roughnessMap = await texture(gloss);
    }
    const mask = settings.AlphaMask.enable ? settings.AlphaMask
      : opacity.type === "alphaBlend" ? opacity : null;
    if (mask?.texture) material.alphaMap = await texture(mask);
    const ior = refractive ? opacity.ior : 1.5;
    const f0 = ((ior - 1) / (ior + 1)) ** 2;
    material.ior = ior;
    material.specularColor.fromArray(specular.color ?? [1, 1, 1])
      .multiplyScalar(specular.factor / Math.max(1e-8, f0));
    if (specular.texture) material.specularColorMap = await texture(specular, true);
    if (refractive) {
      material.sourceOpacityMap = await texture(opacity);
      material.transparent = true;
      material.blending = THREE.NoBlending;
      material.opacity = 1;
      material.depthWrite = true;
    }
    configureBlackHoleShader(material, settings);
    if (material.name === "ring2")
      material.userData.blackHoleSurface.bumpTexel.value.set(1 / 256, 1 / 256);
    if (material.transparent && !refractive) material.depthWrite = false;
    replacements.set(original, material);
  }));
  scene.traverse((object) => {
    if (object.isMesh && replacements.has(object.material)) {
      object.material = replacements.get(object.material);
      if (object.material.bumpMap) {
        const geometry = object.geometry, uv = geometry.getAttribute("uv");
        const bumpUv = geometry.getAttribute(object.material.bumpMap.channel === 1 ? "uv1" : "uv");
        if (bumpUv && geometry.index) {
          geometry.setAttribute("uv", bumpUv);
          geometry.computeTangents();
          geometry.setAttribute("uv", uv);
        }
      }
    }
  });
  // Original materials no longer participate in rendering; their embedded
  // texture objects remain shared by the restored materials.
  originals.forEach((material) => material.dispose());
}

export function blackHoleOrientation(viewerDirection) {
  const { azimuth, elevation, roll } = reference.presentation;
  const a = THREE.MathUtils.degToRad(azimuth), e = THREE.MathUtils.degToRad(elevation);
  const source = new THREE.Vector3(Math.sin(a) * Math.cos(e), Math.sin(e), Math.cos(a) * Math.cos(e));
  // The supplied GLB already bakes in scene orientation. Applying it again
  // tips the accretion disk edge-on and hides the reference's upper hemisphere.
  const target = viewerDirection.clone().normalize();
  const up = new THREE.Vector3(0, 1, 0);
  const sourceFrame = new THREE.Quaternion().setFromRotationMatrix(
    new THREE.Matrix4().lookAt(source, new THREE.Vector3(), up),
  );
  sourceFrame.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), THREE.MathUtils.degToRad(roll)));
  const targetFrame = new THREE.Quaternion().setFromRotationMatrix(
    new THREE.Matrix4().lookAt(target, new THREE.Vector3(), up),
  );
  return targetFrame.multiply(sourceFrame.invert());
}
