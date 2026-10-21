import * as THREE from "three";
import { lightingPresets } from "./render-settings.js";

// Fade the gallery with the smoothed expansion, leaving the exhibit's own
// emission and exposure intact. A faint ambient floor keeps the room legible.
export function createGalleryLighting({
  scene, renderer, sun, hemisphere, materials, architecture, exhibitLighting,
}) {
  const background = Object.fromEntries(Object.entries(lightingPresets)
    .map(([mode, preset]) => [mode, new THREE.Color(preset.background)]));
  const darkness = new THREE.Color("#080b12");
  const fixtureColor = materials.light.color.clone();
  let previousMode, previousExpansion;

  return {
    update(mode, expansion = 0) {
      const dimming = THREE.MathUtils.clamp(expansion, 0, 1);
      if (mode === previousMode && dimming === previousExpansion) return;
      previousMode = mode;
      previousExpansion = dimming;
      const preset = lightingPresets[mode];
      const remaining = 1 - dimming;
      sun.intensity = preset.sun * remaining;
      sun.color.set(preset.sunColor);
      hemisphere.intensity = THREE.MathUtils.lerp(preset.hemisphere, 0.012, dimming);
      scene.environmentIntensity = THREE.MathUtils.lerp(preset.environment, 0.008, dimming);
      renderer.toneMappingExposure = preset.exposure;
      scene.background.copy(background[mode]).lerp(darkness, dimming);
      scene.fog.color.copy(scene.background);
      materials.skylight.emissiveIntensity = preset.skylightGlow * remaining;
      materials.light.color.copy(fixtureColor).multiplyScalar(remaining);
      exhibitLighting.setIntensity(preset.spot * remaining);
      for (const light of architecture.lights)
        light.intensity = light.userData.dayIntensity * preset.daylight * remaining;
      // Intensity/color changes reuse the static shadow depth and light budget.
    },
  };
}
