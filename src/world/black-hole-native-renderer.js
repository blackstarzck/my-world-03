import * as THREE from "three";
import { Pass, FullScreenQuad } from "three/addons/postprocessing/Pass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { BlackHoleRefractionPass } from "./black-hole-native-optics.js";
import { blackHoleReference as reference } from "./black-hole-native-materials.js";
import { blackHoleColorBalanceShader } from "./black-hole-color.js";
import { BlackHoleAntialias } from "./black-hole-antialias.js";
import { BlackHoleFocus } from "./black-hole-focus.js";
import { BlackHoleDepth } from "./black-hole-depth.js";

function configureBloom(bloom) {
  bloom.materialHighPassFilter.fragmentShader = /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float luminosityThreshold;
    uniform sampler2D coverageMap;
    varying vec2 vUv;
    void main() {
      float coverage = texture2D(coverageMap,vUv).a;
      vec3 color = texture2D(tDiffuse, vUv).rgb * coverage;
      gl_FragColor = vec4(clamp(color * clamp(luminance(color)
        - luminosityThreshold, 0.0, 1.0), 0.0, 1.0), 1.0);
    }
  `;
  bloom.compositeMaterial.uniforms.bloomFactors.value = [1.1, 0.9, 0.6, 0.3, 0.1];
  [4, 6, 8, 10, 12].forEach((order, index) => {
    const coefficients = [1];
    for (let i = 1; i <= order; i++) coefficients.push(coefficients[i - 1] * (order - i + 1) / i);
    coefficients.forEach((_, i) => { coefficients[i] /= 2 ** order; });
    const middle = Math.floor(order / 2), offsets = [], weights = [];
    for (let i = middle + 1, distance = 1; i < order; i += 2, distance += 2) {
      const a = coefficients[i], b = coefficients[i + 1], weight = a + b;
      if (weight < 0.005 / order) break;
      offsets.push((distance * a + (distance + 1) * b) / weight);
      weights.push(weight);
    }
    const material = bloom.separableBlurMaterials[index];
    material.defines.KERNEL_PAIRS = offsets.length;
    material.uniforms.centerWeight.value = coefficients[middle];
    material.uniforms.gaussianOffsets.value = offsets;
    material.uniforms.gaussianWeights.value = weights;
  });
}

// Render the source optical stack against black space. The gallery is never
// captured into its refraction texture, so no tinted support sheet paints walls.
export class BlackHoleNativeRenderer extends Pass {
  constructor(exhibit, camera) {
    super();
    this.needsSwap = false;
    this.exhibit = exhibit;
    this.camera = camera;
    this.scene = new THREE.Scene();
    this.space = new THREE.Color(0);
    this.scene.background = this.space;
    this.root = new THREE.Group();
    this.scene.add(this.root);
    this.sources = [];
    this.scale = new THREE.Vector3();
    this.oldColor = new THREE.Color();
    this.coreWorld = new THREE.Vector3();
    this.coreView = new THREE.Vector3();
    this.focus = new THREE.Vector3();
    exhibit.traverse((source) => {
      if (!source.isMesh) return;
      const proxy = new THREE.Mesh(source.geometry, source.material);
      proxy.matrixAutoUpdate = false;
      proxy.onBeforeRender = source.onBeforeRender;
      this.root.add(proxy);
      this.sources.push({ source, proxy });
      if (source.material.name === "black_hole_center") {
        this.core = source;
        source.geometry.computeBoundingSphere();
      }
    });
    this.capture = new BlackHoleRefractionPass(this.scene, this.root, camera);
    this.depth = new BlackHoleDepth(this.sources, camera);
    this.capture.sceneDepth = this.depth.target.depthTexture;
    this.captureCopy = new THREE.ShaderMaterial({
      uniforms: { color: { value: this.capture.target.texture }, depth: { value: this.capture.target.depthTexture } },
      vertexShader: `varying vec2 vUv; void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}`,
      fragmentShader: `uniform sampler2D color, depth; varying vec2 vUv;
        void main(){gl_FragColor=texture2D(color,vUv);gl_FragDepth=texture2D(depth,vUv).r;}`,
      depthTest: true, depthWrite: true, depthFunc: THREE.AlwaysDepth, blending: THREE.NoBlending, toneMapped: false,
    });
    this.captureQuad = new FullScreenQuad(this.captureCopy);
    this.antialias = new BlackHoleAntialias();
    this.focusFilter = new BlackHoleFocus(reference.postProcess.dof);
    this.model = new THREE.WebGLRenderTarget(256, 256, {
      type: THREE.HalfFloatType, samples: 4,
    });
    this.model.depthTexture = new THREE.DepthTexture(256, 256);
    this.finished = new THREE.WebGLRenderTarget(256, 256, {
      type: THREE.HalfFloatType, depthBuffer: false,
    });
    this.bloom = new UnrealBloomPass(new THREE.Vector2(256, 256),
      // Preserve source coverage and calibrate buffer gain to the supplied
      // reference, rather than increasing emission or bleaching its textures.
      reference.postProcess.bloom.factor * .28, reference.postProcess.bloom.radius, 0);
    this.bloom.materialHighPassFilter.uniforms.coverageMap = { value: this.depth.target.texture };
    configureBloom(this.bloom);
    this.finishMaterial = new THREE.ShaderMaterial({
      uniforms: {
        source: { value: this.model.texture },
        chroma: { value: reference.postProcess.chromaticAberration.factor },
        balance: { value: 1 }, exposure: { value: 1 },
        coreCenter: { value: new THREE.Vector2(0.5, 0.5) },
        coreRadius: { value: new THREE.Vector2(0.1, 0.1) },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
      `,
      fragmentShader: /* glsl */ `
        uniform sampler2D source;
        uniform float chroma, balance, exposure;
        uniform vec2 coreCenter, coreRadius;
        varying vec2 vUv;
        ${blackHoleColorBalanceShader}
        void main() {
          vec2 radial = vUv - 0.5;
          vec2 offset = chroma * radial * length(radial);
          vec3 color;
          color.r = texture2D(source, vUv - offset).r;
          color.g = texture2D(source, vUv).g;
          color.b = texture2D(source, vUv + offset).b;
          color = mix(color, sourceColorBalance(color), balance) * exposure;
          color *= 1.0 - smoothstep(.25, .8, length(radial));
          float d = length((vUv - coreCenter) / max(coreRadius, vec2(0.00001)));
          float matte = 1.0 - smoothstep(1.0 - fwidth(d), 1.0 + fwidth(d), d);
          gl_FragColor = vec4(color, matte);
        }
      `,
      blending: THREE.NoBlending, depthTest: false, depthWrite: false, toneMapped: false,
    });
    this.finishQuad = new FullScreenQuad(this.finishMaterial);
    this.screenMaterial = new THREE.ShaderMaterial({
      uniforms: { source: { value: this.finished.texture } },
      vertexShader: this.finishMaterial.vertexShader,
      fragmentShader: /* glsl */ `
        uniform sampler2D source;
        varying vec2 vUv;
        void main() {
          gl_FragColor = vec4(texture2D(source, vUv).rgb, 1.0);
          #include <colorspace_fragment>
        }
      `,
      depthTest: false, depthWrite: false, toneMapped: false,
    });
    this.screenQuad = new FullScreenQuad(this.screenMaterial);
  }

  setSize(width, height) {
    this.capture.setSize(width, height);
    this.depth.setSize(width,height);
    this.model.setSize(width, height);
    this.finished.setSize(width, height);
    this.setHaloSize(width, height);
    this.antialias.setSize(width, height);
    this.focusFilter.setSize(width, height);
  }

  setHaloSize(width, height) {
    this.bloom.setSize(width, height);
    // The source reuses Gaussian programs first created by refraction, whose
    // footprint is scaled by viewport height. Preserve it at cheaper halo sizes.
    const footprint = this.finished.height * .00075 * width / this.finished.width;
    this.bloom.separableBlurMaterials.forEach(material => material.uniforms.invSize.value.multiplyScalar(footprint));
  }

  render(renderer) {
    const previous = renderer.getRenderTarget();
    renderer.getClearColor(this.oldColor);
    const oldAlpha = renderer.getClearAlpha(), oldAutoClear = renderer.autoClear;
    try {
      this.exhibit.updateWorldMatrix(true, true);
      this.exhibit.getWorldScale(this.scale);
      this.root.userData.refractionRadius = this.exhibit.userData.refractionRadius
        * Math.max(this.scale.x, this.scale.y, this.scale.z);
      for (const { source, proxy } of this.sources) proxy.matrix.copy(source.matrixWorld);
      this.antialias.begin(this.camera);
      renderer.setClearColor(0,0);
      this.depth.render(renderer);
      this.capture.render(renderer);
      renderer.autoClear = false;
      renderer.setClearColor(0, 0);
      renderer.setRenderTarget(this.model);
      renderer.clear();
      this.captureQuad.render(renderer);
      // Blended rings must all be present BEFORE refraction. Preserve their
      // captured color/depth and draw only the nearest optical shells next.
      this.scene.background = null;
      for (const { proxy } of this.sources) proxy.visible = !!proxy.material.userData.blackHoleOptics;
      renderer.render(this.scene, this.camera);
      for (const { proxy } of this.sources) proxy.visible = true;
      this.scene.background = this.space;
      this.antialias.resolve(renderer, this.model, this.camera);
      this.coreView.copy(this.exhibit.userData.focusPoint ?? this.focus)
        .applyMatrix4(this.exhibit.matrixWorld).applyMatrix4(this.camera.matrixWorldInverse);
      this.focusFilter.render(renderer, this.model, this.antialias.targets[this.antialias.index].texture,
        this.camera, Math.max(this.camera.near, -this.coreView.z), this.depth.target.depthTexture);
      this.bloom.render(renderer, null, this.model);
      if (this.core) {
        this.coreWorld.copy(this.core.geometry.boundingSphere.center).applyMatrix4(this.core.matrixWorld);
        this.coreView.copy(this.coreWorld).applyMatrix4(this.camera.matrixWorldInverse);
        this.core.getWorldScale(this.scale);
        const r = this.core.geometry.boundingSphere.radius * Math.max(this.scale.x, this.scale.y, this.scale.z);
        const ry = this.camera.projectionMatrix.elements[5] * r / Math.max(0.001, -this.coreView.z) * 0.5;
        this.coreWorld.project(this.camera);
        this.finishMaterial.uniforms.coreCenter.value.set((this.coreWorld.x + 1) / 2, (this.coreWorld.y + 1) / 2);
        this.finishMaterial.uniforms.coreRadius.value.set(ry / this.camera.aspect, ry);
      }
      renderer.setRenderTarget(this.finished);
      this.finishQuad.render(renderer);
      if (this.renderToScreen) {
        renderer.setRenderTarget(null);
        this.screenQuad.render(renderer);
      }
    } finally {
      this.camera.projectionMatrix.copy(this.antialias.projection);
      this.camera.projectionMatrixInverse.copy(this.camera.projectionMatrix).invert();
      for (const { proxy } of this.sources) proxy.visible = true;
      this.scene.background = this.space;
      renderer.setRenderTarget(previous);
      renderer.setClearColor(this.oldColor, oldAlpha);
      renderer.autoClear = oldAutoClear;
    }
  }

  dispose() {
    this.capture.dispose(); this.model.dispose(); this.finished.dispose(); this.bloom.dispose();
    this.captureCopy.dispose(); this.captureQuad.dispose();
    this.antialias.dispose();
    this.focusFilter.dispose();
    this.depth.dispose();
    this.finishMaterial.dispose(); this.finishQuad.dispose(); this.screenMaterial.dispose(); this.screenQuad.dispose();
  }
}
