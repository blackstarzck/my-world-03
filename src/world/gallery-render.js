import * as THREE from "three";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { FullScreenQuad } from "three/addons/postprocessing/Pass.js";
import { CopyShader } from "three/addons/shaders/CopyShader.js";

// Multisample the scene edges once, then use single-sample fullscreen buffers.
// The same resolved scene depth remains valid after AO swaps the color buffers.
export class GalleryRenderPass extends RenderPass {
  constructor(scene, camera) {
    super(scene, camera);
    this.target = new THREE.WebGLRenderTarget(256, 256, {
      type: THREE.HalfFloatType, samples: 2,
    });
    this.target.depthTexture = new THREE.DepthTexture(256, 256);
    this.copy = new THREE.ShaderMaterial({
      ...CopyShader, uniforms: THREE.UniformsUtils.clone(CopyShader.uniforms),
      depthTest: false, depthWrite: false, toneMapped: false,
      blending: THREE.NoBlending,
    });
    this.quad = new FullScreenQuad(this.copy);
  }

  setSize(width, height) { this.target.setSize(width, height); }

  setSamples(samples) {
    if (samples === this.target.samples) return;
    this.target.dispose();
    this.target.samples = samples;
  }

  render(renderer, writeBuffer, readBuffer, ...rest) {
    super.render(renderer, writeBuffer, this.target, ...rest);
    this.copy.uniforms.tDiffuse.value = this.target.texture;
    renderer.setRenderTarget(readBuffer);
    this.quad.render(renderer);
  }

  dispose() {
    this.target.dispose(); this.copy.dispose(); this.quad.dispose();
  }
}
