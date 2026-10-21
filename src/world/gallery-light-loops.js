import { ShaderChunk } from "three";

// Keep every light and Three's lighting equations. A runtime loop avoids
// compiling a separate copy of the full BRDF for every unshadowed fixture.
// Shadowed/mapped spots retain Three's constant-index sampler implementation.
const spotPattern = /#if \( NUM_SPOT_LIGHTS > 0 \) && defined\( RE_Direct \)[\s\S]*?(?=#if \( NUM_SUN_LIGHTS > 0 \))/;
const areaPattern = /#pragma unroll_loop_start\s*for \( int i = 0; i < NUM_RECT_AREA_LIGHTS; i \+\+ \) \{([\s\S]*?)\}\s*#pragma unroll_loop_end/;

export const galleryLightFragment = ShaderChunk.lights_fragment_begin
  .replace(spotPattern, original => `
    #if NUM_SPOT_LIGHT_SHADOWS == 0 && NUM_SPOT_LIGHT_MAPS == 0
      #if ( NUM_SPOT_LIGHTS > 0 ) && defined( RE_Direct )
        for (int gallerySpot = 0; gallerySpot < NUM_SPOT_LIGHTS && gallerySpot < gallerySpotLightCount; gallerySpot++) {
          getSpotLightInfo(spotLights[gallerySpot], geometryPosition, directLight);
          RE_Direct(directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight);
        }
      #endif
    #else
      ${original}
    #endif
  `)
  .replace(areaPattern, (_, body) => `
    for (int i = 0; i < NUM_RECT_AREA_LIGHTS && i < galleryAreaLightCount; i++) { ${body} }
  `);

export function configureGalleryLightLoops(scene) {
  const materials = new Set();
  scene.traverseVisible(object => {
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
      if (material?.isMeshStandardMaterial && !material.userData.galleryLightLoops) materials.add(material);
    }
  });
  for (const material of materials) {
    const compile = material.onBeforeCompile, key = material.customProgramCacheKey();
    material.onBeforeCompile = function(shader, renderer) {
      compile.call(this, shader, renderer);
      let spots = 0, areas = 0;
      scene.traverseVisible(object => {
        if (object.isSpotLight) spots++;
        if (object.isRectAreaLight) areas++;
      });
      shader.uniforms.gallerySpotLightCount = { value: spots };
      shader.uniforms.galleryAreaLightCount = { value: areas };
      shader.fragmentShader = `uniform int gallerySpotLightCount, galleryAreaLightCount;\n${shader.fragmentShader}`
        .replace("#include <lights_fragment_begin>", galleryLightFragment);
    };
    material.customProgramCacheKey = () => `${key}|gallery-light-loops-v1`;
    material.userData.galleryLightLoops = true;
  }
}
