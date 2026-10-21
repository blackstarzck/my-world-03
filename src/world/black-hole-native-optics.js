import * as THREE from "three";
import { Pass, FullScreenQuad } from "three/addons/postprocessing/Pass.js";
import reference from "./black-hole-reference.json" with { type: "json" };

const shBasis = [
  1 / (2 * Math.sqrt(Math.PI)), -.5 * Math.sqrt(3 / Math.PI), .5 * Math.sqrt(3 / Math.PI),
  -.5 * Math.sqrt(3 / Math.PI), .5 * Math.sqrt(15 / Math.PI), -.5 * Math.sqrt(15 / Math.PI),
  .25 * Math.sqrt(5 / Math.PI), -.5 * Math.sqrt(15 / Math.PI), .25 * Math.sqrt(15 / Math.PI),
];

export const blackHoleCameraFade = { near: 0.35, far: 1.5 };
export const usesBlackHoleCameraFade = (name) =>
  /^(ring2?|black_hole_light3|black_hole_blackoutside)$/.test(name);

// The source viewer uses a screen refraction layer, not volume transmission.
// Capture blended rings as well as opaque light before drawing optical shells.
export class BlackHoleRefractionPass extends Pass {
  constructor(scene, exhibit, camera) {
    super();
    this.needsSwap = false;
    this.scene = scene;
    this.exhibit = exhibit;
    this.camera = camera;
    this.surfaces = [];
    exhibit.traverse((object) => {
      if (object.material?.userData.blackHoleOptics) this.surfaces.push(object);
    });
    this.target = new THREE.WebGLRenderTarget(256, 256, {
      type: THREE.HalfFloatType,
      samples: 4,
    });
    this.target.depthTexture = new THREE.DepthTexture(256, 256);
    this.mips = [this.target];
    this.temps = [];
    this.blurMaterials = [];
    this.quad = new FullScreenQuad();
    for (let level = 1; level <= 7; level++) {
      const options = { type: THREE.HalfFloatType, depthBuffer: false };
      this.mips.push(new THREE.WebGLRenderTarget(128, 128, options));
      this.temps.push(new THREE.WebGLRenderTarget(128, 128, options));
      const order = 2 * level + 2, coefficients = [1];
      for (let i = 1; i <= order; i++) coefficients[i] = coefficients[i - 1] * (order - i + 1) / i;
      coefficients.forEach((n, i) => { coefficients[i] = n / 2 ** order; });
      const middle = order / 2, taps = [];
      for (let i = middle + 1, distance = 1; i < order; i += 2, distance += 2) {
        const a = coefficients[i], b = coefficients[i + 1], weight = a + b;
        taps.push(`color += ${weight} * (texture2D(inputColor, vUv + stepUv * ${(distance * a + (distance + 1) * b) / weight}).rgb
          + texture2D(inputColor, vUv - stepUv * ${(distance * a + (distance + 1) * b) / weight}).rgb);`);
      }
      this.blurMaterials.push(new THREE.ShaderMaterial({
        uniforms: { inputColor: { value: null }, stepUv: { value: new THREE.Vector2() } },
        vertexShader: `varying vec2 vUv; void main() {vUv=uv;gl_Position=vec4(position.xy,0.,1.);}`,
        fragmentShader: `uniform sampler2D inputColor; uniform vec2 stepUv; varying vec2 vUv;
          void main() { vec3 color=texture2D(inputColor,vUv).rgb * ${coefficients[middle]};
            ${taps.join("\n")} gl_FragColor=vec4(color,1.); }`,
        depthTest: false, depthWrite: false, blending: THREE.NoBlending, toneMapped: false,
      }));
    }
    this.scale = new THREE.Vector3();
  }

  setSize(width, height) {
    this.target.setSize(width, height);
    for (let i = 1; i <= 7; i++) {
      const w = Math.max(1, Math.round(width / 2 ** i)), h = Math.max(1, Math.round(height / 2 ** i));
      this.mips[i].setSize(w, h); this.temps[i - 1].setSize(w, h);
    }
  }

  render(renderer) {
    const previous = renderer.getRenderTarget();
    const visible = this.surfaces.map((object) => object.visible);
    try {
      this.exhibit.getWorldScale(this.scale);
      const radius = this.exhibit.userData.refractionRadius
        * Math.max(this.scale.x, this.scale.y, this.scale.z);
      for (const object of this.surfaces) {
        object.visible = false;
        const uniforms = object.material.userData.blackHoleOptics;
        uniforms.sceneColor.value = this.target.texture;
        this.mips.forEach((target, index) => { uniforms[`sceneMip${index}`].value = target.texture; });
        uniforms.sceneDepth.value = this.sceneDepth ?? this.target.depthTexture;
        uniforms.captureSize.value.set(this.target.width, this.target.height);
        uniforms.cameraNearFar.value.set(this.camera.near, this.camera.far);
        uniforms.modelRadius.value = radius;
        uniforms.sourceProjection.value.copy(this.camera.projectionMatrix);
      }
      renderer.setRenderTarget(this.target);
      renderer.clear();
      renderer.render(this.scene, this.camera);
      // The source viewer uses seven Gaussian color levels, not ordinary box
      // mipmaps. Their wider footprints soften the curved optical boundary.
      const scale = this.target.height * .00075;
      for (let i = 0; i < 7; i++) {
        const material = this.blurMaterials[i], target = this.mips[i + 1];
        this.quad.material = material;
        material.uniforms.inputColor.value = this.mips[i].texture;
        material.uniforms.stepUv.value.set(0, scale / target.height);
        renderer.setRenderTarget(this.temps[i]); this.quad.render(renderer);
        material.uniforms.inputColor.value = this.temps[i].texture;
        material.uniforms.stepUv.value.set(scale / target.width, 0);
        renderer.setRenderTarget(target); this.quad.render(renderer);
      }
    } finally {
      this.surfaces.forEach((object, index) => { object.visible = visible[index]; });
      renderer.setRenderTarget(previous);
    }
  }

  dispose() {
    this.mips.forEach(target => target.dispose()); this.temps.forEach(target => target.dispose());
    this.blurMaterials.forEach(material => material.dispose()); this.quad.dispose();
  }
}

export function configureBlackHoleShader(material, settings) {
  const { BumpMap: bump, Opacity: opacity, GlossinessPBR: gloss } = settings;
  const refractive = opacity.enable && opacity.type === "refraction";
  material.defines = { ...material.defines, USE_UV: "" };
  if (material.bumpMap) material.defines.USE_TANGENT = "";
  const uniforms = {
    sourceLightPosition: { value: new THREE.Vector3() },
    sourceLightColor: { value: new THREE.Vector3() },
    sourceLightFalloff: { value: 0 },
    sourceEnvironment: { value: null },
    sourceDiffuseSH: { value: shBasis.map((factor, i) => new THREE.Vector3()
      .fromArray(reference.environment.diffuseSPH, i * 3).multiplyScalar(factor)) },
    sourceEnvironmentTransform: { value: new THREE.Matrix3() },
    bumpTexel: { value: new THREE.Vector2(
      1 / (material.bumpMap?.image?.width ?? 1),
      1 / (material.bumpMap?.image?.height ?? 1),
    ) },
    sceneColor: { value: null },
    sceneDepth: { value: null },
    captureSize: { value: new THREE.Vector2() },
    cameraNearFar: { value: new THREE.Vector2() },
    modelRadius: { value: 1 },
    sourceProjection: { value: new THREE.Matrix4() },
    sourceIor: { value: opacity.ior ?? 1.5 },
    sourceOpacity: { value: opacity.factor },
    refractionTint: { value: new THREE.Vector3().fromArray(opacity.refractionColor) },
    refractionRoughness: { value: opacity.roughnessFactor },
    sourceOpacityMap: { value: material.sourceOpacityMap ?? null },
    sourceOpacityTransform: { value: material.sourceOpacityMap?.matrix ?? new THREE.Matrix3() },
  };
  for (let i = 0; i < 8; i++) uniforms[`sceneMip${i}`] = { value: null };
  material.userData.blackHoleSurface = uniforms;
  if (refractive) material.userData.blackHoleOptics = uniforms;
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.fragmentShader = /* glsl */ `
      uniform vec2 bumpTexel;
      uniform sampler2D sceneColor, sceneDepth, sourceOpacityMap;
      uniform vec2 captureSize, cameraNearFar;
      uniform mat3 sourceOpacityTransform;
      uniform mat4 sourceProjection;
      uniform float modelRadius, sourceIor, sourceOpacity, refractionRoughness;
      uniform vec3 refractionTint;
      uniform vec3 sourceLightPosition, sourceLightColor;
      uniform float sourceLightFalloff;
      uniform samplerCube sourceEnvironment;
      uniform vec3 sourceDiffuseSH[9];
      uniform mat3 sourceEnvironmentTransform;
      ${Array.from({ length: 8 }, (_, i) => `uniform sampler2D sceneMip${i};`).join("\n")}
      vec3 sourceRefractionLevel(vec2 p, float level) {
        vec3 result = vec3(0.0);
        ${Array.from({ length: 7 }, (_, i) => `${i ? "else " : ""}if (level < ${i + .5}) result = texture2D(sceneMip${i}, p).rgb;`).join("\n")}
        else result = texture2D(sceneMip7, p).rgb;
        return result;
      }
    ` + shader.fragmentShader;
    // Opacity maps carry authored alpha, not their green color channel.
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <alphamap_fragment>",
      "#ifdef USE_ALPHAMAP\n diffuseColor.a *= texture2D(alphaMap, vAlphaMapUv).a;\n #endif",
    );
    if (usesBlackHoleCameraFade(material.name)) shader.fragmentShader = shader.fragmentShader.replace(
      "#include <alphatest_fragment>", /* glsl */ `
        #include <alphatest_fragment>
        // Expansion can bring the outer disk through the visitor's near
        // plane. Fade only that close foreground instead of showing a sheet
        // of magnified texels. The central ring remains outside this range.
        diffuseColor.a *= smoothstep(${blackHoleCameraFade.near.toFixed(2)},
          ${blackHoleCameraFade.far.toFixed(2)}, vViewPosition.z);
        if (diffuseColor.a < 0.001) discard;
      `,
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <lights_fragment_begin>", /* glsl */ `
        // Source glossiness directly sets the GGX lobe. Three's extra
        // derivative roughness otherwise erases the authored glittering detail.
        material.roughness = max(roughnessFactor, 0.045);
        ${refractive ? `float sourceSurfaceOpacity = sourceOpacity;
          ${opacity.texture ? "sourceSurfaceOpacity *= texture2D(sourceOpacityMap, (sourceOpacityTransform * vec3(vUv,1.0)).xy).a;" : ""}
          material.specularColor *= mix(.08,1.0,sourceSurfaceOpacity);` : ""}
        material.specularF90 = clamp(50.0 * material.specularColor.g, 0.0, 1.0);
        #include <lights_fragment_begin>
        IncidentLight sourceLight;
        vec3 sourceLightVector = sourceLightPosition + vViewPosition;
        sourceLight.color = sourceLightColor /
          (1.0 + sourceLightFalloff * dot(sourceLightVector, sourceLightVector));
        sourceLight.direction = normalize(sourceLightVector);
        sourceLight.visible = true;
        float noL = max(dot(geometryNormal,sourceLight.direction),0.0);
        float noV = max(dot(geometryNormal,geometryViewDir),0.0);
        vec3 halfVector = normalize(geometryViewDir+sourceLight.direction);
        float noH = max(dot(geometryNormal,halfVector),0.0);
        float voH = max(dot(sourceLight.direction,halfVector),0.0);
        float a = material.roughness * material.roughness, a2 = a*a;
        float denominator = (noH*a2-noH)*noH+1.0;
        float distribution = a2 / max(denominator*denominator,1e-12);
        float visibility = .5 / max(noL*(noV*(1.0-a)+a)+noV*(noL*(1.0-a)+a),1e-8);
        vec3 fresnel = mix(material.specularColor,vec3(material.specularF90),pow(1.0-voH,5.0));
        reflectedLight.directDiffuse += sourceLight.color * noL * material.diffuseColor;
        reflectedLight.directSpecular += sourceLight.color * noL * distribution * visibility * fresnel;
      `,
    );
    shader.fragmentShader = shader.fragmentShader.replace("#include <lights_fragment_end>", /* glsl */ `
      #include <lights_fragment_end>
      // These coefficients use the source's signed SH basis, with irradiance
      // already convolved. Three's LightProbe basis and PI factors differ.
      vec3 n = normalize(sourceEnvironmentTransform * inverseTransformDirection(geometryNormal,viewMatrix));
      vec3 diffuseEnvironment = sourceDiffuseSH[0] + sourceDiffuseSH[1]*n.y
        + sourceDiffuseSH[2]*n.z + sourceDiffuseSH[3]*n.x + sourceDiffuseSH[4]*n.y*n.x
        + sourceDiffuseSH[5]*n.y*n.z + sourceDiffuseSH[6]*(3.0*n.z*n.z-1.0)
        + sourceDiffuseSH[7]*n.z*n.x + sourceDiffuseSH[8]*(n.x*n.x-n.y*n.y);
      reflectedLight.indirectDiffuse += material.diffuseColor * max(diffuseEnvironment,vec3(0.0)) * 2.0;
      float smoothness = 1.0-roughnessFactor;
      vec3 reflected = mix(geometryNormal,reflect(-geometryViewDir,geometryNormal),
        smoothness*(sqrt(smoothness)+roughnessFactor));
      float horizon = clamp(1.0+dot(reflected,nonPerturbedNormal),0.0,1.0);
      vec3 reflectionDirection = inverseTransformDirection(reflected, viewMatrix);
      reflectionDirection = normalize(sourceEnvironmentTransform * reflectionDirection);
      float environmentLod = min(8.0, 5.0 * sqrt(max(roughnessFactor, 0.0)));
      float seamScale = 1.0-exp2(environmentLod)/256.0;
      vec3 absoluteDirection = abs(reflectionDirection);
      float majorDirection = max(max(absoluteDirection.x,absoluteDirection.y),absoluteDirection.z);
      if(absoluteDirection.x!=majorDirection) reflectionDirection.x*=seamScale;
      if(absoluteDirection.y!=majorDirection) reflectionDirection.y*=seamScale;
      if(absoluteDirection.z!=majorDirection) reflectionDirection.z*=seamScale;
      vec4 luv = textureLod(sourceEnvironment, reflectionDirection, environmentLod);
      float luminance = exp2((luv.z * 255.0 + luv.w - 127.0) * .5);
      vec3 xyz = vec3(luv.x, luv.y, 1.0) * luminance / max(luv.y, 1e-5);
      vec3 envColor = max(mat3(6.0013,-2.700,-1.7995,-1.332,3.1029,-5.7720,.3007,-1.088,5.6268) * xyz, vec3(0.0));
      reflectedLight.indirectSpecular += envColor * 2.0 * horizon*horizon * EnvironmentBRDF(geometryNormal,
        geometryViewDir, material.specularColor, material.specularF90, roughnessFactor);
    `);
    if (material.bumpMap) {
      const height = bump.texture.component === "a" ? "sampled.a"
        : "sampled.r";
      shader.fragmentShader = shader.fragmentShader.replace("void main() {", /* glsl */ `
        float sourceHeight(vec2 p) {
          vec4 sampled = texture2D(bumpMap, p);
          return ${height};
        }
        void main() {
      `).replace("#include <normal_fragment_maps>", /* glsl */ `
        // Symmetric one-texel gradients in tangent space, independent of metres.
        vec2 gradient = bumpScale * vec2(
          sourceHeight(vBumpMapUv - vec2(bumpTexel.x, 0.0))
            - sourceHeight(vBumpMapUv + vec2(bumpTexel.x, 0.0)),
          sourceHeight(vBumpMapUv - vec2(0.0, bumpTexel.y))
            - sourceHeight(vBumpMapUv + vec2(0.0, bumpTexel.y)));
        vec3 tangent = vTangent;
        tangent *= inversesqrt(max(dot(tangent, tangent), 1e-16));
        vec3 binormal = cross(normal, tangent);
        binormal *= dot(binormal, vBitangent) < 0.0 ? -1.0 : 1.0;
        binormal *= inversesqrt(max(dot(binormal, binormal), 1e-16));
        normal = normalize(normal + gradient.x * tangent + gradient.y * binormal);
      `);
    }
    if (material.roughnessMap) shader.fragmentShader = shader.fragmentShader.replace(
      "#include <roughnessmap_fragment>", /* glsl */ `
        float sourceGlossFetch = texture2D(
          roughnessMap, vRoughnessMapUv).${gloss.texture.component === "a" ? "a" : "r"};
        float roughnessFactor = 1.0 - ${gloss.factor.toFixed(10)} * sourceGlossFetch;
      `,
    );
    if (refractive) shader.fragmentShader = shader.fragmentShader.replace(
      "#include <opaque_fragment>", /* glsl */ `
        vec3 eye = normalize(vViewPosition);
        vec3 refracted = -vViewPosition + modelRadius * refract(-eye, normal, 1.0 / sourceIor);
        vec4 projected = sourceProjection * vec4(refracted, 1.0);
        vec2 refractedUv = projected.xy / projected.w * 0.5 + 0.5;
        float capturedDepth = texture2D(sceneDepth, clamp(refractedUv, 0.0, 1.0)).r;
        float behindDepth = cameraNearFar.x * cameraNearFar.y /
          ((cameraNearFar.y - cameraNearFar.x) * capturedDepth - cameraNearFar.y);
        if (capturedDepth < 1.0 && vViewPosition.z + behindDepth > 0.001 * (cameraNearFar.y - cameraNearFar.x))
          refractedUv = gl_FragCoord.xy / captureSize;
        // Mirror the edge rather than clamping a bright border across the screen.
        refractedUv = 1.0 - abs(mod(refractedUv, 2.0) - 1.0);
        float adjustment = clamp(sourceProjection[1][1] / 12.0 * modelRadius / vViewPosition.z, 0.0, 1.0);
        adjustment = 1.05 * adjustment / (0.05 + adjustment);
        float opticalRoughness = ${material.roughnessMap
          ? "mix(1.0 - sourceGlossFetch, 1.0, refractionRoughness)" : "refractionRoughness"};
        float lod = 7.0 * min(0.99, opticalRoughness * adjustment);
        vec3 bentLight = mix(sourceRefractionLevel(refractedUv, floor(lod)),
          sourceRefractionLevel(refractedUv, ceil(lod)), fract(lod)) * refractionTint;
        bentLight *= 1.0 - pow(clamp(1.0 + dot(-eye, normal), 0.0, 1.0), 4.0);
        float coverage = sourceOpacity;
        ${opacity.texture ? "coverage *= texture2D(sourceOpacityMap, (sourceOpacityTransform * vec3(vUv, 1.0)).xy).a;" : ""}
        outgoingLight = mix(bentLight, totalDiffuse, coverage)
          + totalSpecular + totalEmissiveRadiance;
        #include <opaque_fragment>
      `,
    );
  };
  material.customProgramCacheKey = () => `black-hole-native-${material.name}`;
}
