import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createGalleryLighting } from "../src/world/gallery-lighting.js";
import { createBlackHoleMotion } from "../src/world/black-hole-motion.js";
import { lightingPresets } from "../src/world/render-settings.js";

function fixture(mode) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color();
  scene.fog = new THREE.Fog("#ffffff", 65, 180);
  const sun = new THREE.DirectionalLight();
  const hemisphere = new THREE.HemisphereLight();
  const area = new THREE.RectAreaLight();
  area.userData.dayIntensity = 12;
  scene.add(sun, hemisphere, area);
  const materials = {
    skylight: new THREE.MeshStandardMaterial({ emissive: "#d6e4e5" }),
    light: new THREE.MeshBasicMaterial({ color: "#fff1c9" }),
  };
  const renderer = {};
  let spot;
  const lighting = createGalleryLighting({
    scene, renderer, sun, hemisphere, materials,
    architecture: { lights: [area] },
    exhibitLighting: { setIntensity(value) { spot = value; } },
  });
  const exhibit = new THREE.Group();
  exhibit.position.y = 1.75;
  const motion = createBlackHoleMotion(exhibit);
  const step = (distance, seconds) => {
    for (let frame = 0; frame < seconds * 60; frame++) {
      motion.update(1 / 60, new THREE.Vector3(distance, 1.75, 0));
      lighting.update(mode, motion.expansion);
    }
  };
  lighting.update(mode);
  return { scene, sun, hemisphere, area, materials, renderer, lighting, motion, step,
    get spot() { return spot; } };
}

for (const mode of ["day", "evening"]) {
  test(`${mode}: approach fades gallery lights with expansion; retreat restores the chosen preset`, () => {
    const f = fixture(mode);
    const preset = lightingPresets[mode];
    const originalBackground = f.scene.background.clone();
    f.step(2.5, 0.2);
    assert.ok(f.sun.intensity > preset.sun * 0.9, "no abrupt blackout on approach");
    f.step(2.5, 0.8);
    const intermediate = f.sun.intensity;
    assert.ok(intermediate > 0 && intermediate < preset.sun * 0.7);
    f.step(2.5, 3);
    assert.ok(f.sun.intensity < intermediate * 0.01);
    assert.ok(f.spot < preset.spot * 0.001, "evening spotlights also dim");
    assert.ok(f.area.intensity < 0.01);
    assert.ok(f.materials.light.color.r < 0.001, "visible fixtures switch off too");
    assert.ok(f.materials.skylight.emissiveIntensity < 0.001);
    assert.equal(f.renderer.toneMappingExposure, preset.exposure,
      "room dimming does not dim the black hole through global exposure");
    assert.ok(f.hemisphere.intensity >= 0.012 && f.scene.environmentIntensity >= 0.008,
      "faint ambient light preserves the room silhouette");
    assert.deepEqual(f.scene.fog.color, f.scene.background);
    f.step(9, 0.5);
    assert.ok(f.sun.intensity > 0 && f.sun.intensity < preset.sun * 0.7,
      "retreat restores light gradually");
    f.step(9, 6);
    assert.equal(f.motion.expansion, 0);
    assert.equal(f.sun.intensity, preset.sun);
    assert.equal(f.spot, preset.spot);
    assert.equal(f.area.intensity, 12 * preset.daylight);
    assert.equal(f.materials.skylight.emissiveIntensity, preset.skylightGlow);
    assert.deepEqual(f.scene.background, originalBackground);
    assert.equal(f.scene.children.length, 3, "fading reuses the existing lights");
  });
}

test("changing lighting mode during expansion keeps the current fade", () => {
  const f = fixture("day");
  f.lighting.update("day", 0.75);
  f.lighting.update("evening", 0.75);
  assert.equal(f.sun.intensity, lightingPresets.evening.sun * 0.25);
  assert.equal(f.spot, lightingPresets.evening.spot * 0.25);
  f.lighting.update("evening", 1);
  const dark = f.scene.background.clone();
  f.lighting.update("day", 1);
  assert.equal(f.sun.intensity, 0);
  assert.equal(f.spot, 0);
  assert.ok(f.scene.background.toArray().every((value, i) =>
    Math.abs(value - dark.toArray()[i]) < 1e-12));
  f.lighting.update("day", 0);
  assert.equal(f.sun.intensity, lightingPresets.day.sun);
  assert.deepEqual(f.scene.background, new THREE.Color(lightingPresets.day.background));
});
