import * as THREE from "three";
import { FullScreenQuad } from "three/addons/postprocessing/Pass.js";

const vertexShader = `varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}`;
const halton = (index, base) => {
  let value = 0, fraction = 1;
  while (index > 0) { fraction /= base; value += fraction * (index % base); index = Math.floor(index / base); }
  return value;
};

// Accumulate subpixel alpha-mask detail while stationary. Reset on camera
// movement, and clamp history to current neighbours to avoid luminous trails.
export class BlackHoleAntialias {
  constructor() {
    this.targets = [0, 1].map(() => new THREE.WebGLRenderTarget(256, 256, {
      type: THREE.HalfFloatType, depthBuffer: false,
    }));
    this.frame = 0; this.valid = false; this.index = 0;
    this.position = new THREE.Vector3(Infinity, Infinity, Infinity);
    this.quaternion = new THREE.Quaternion(); this.projection = new THREE.Matrix4();
    this.jitter = new THREE.Vector2();
    this.material = new THREE.ShaderMaterial({
      uniforms: { current: { value: null }, history: { value: null },
        texel: { value: new THREE.Vector2(1 / 256, 1 / 256) }, jitter: { value: this.jitter }, weight: { value: 0 } },
      vertexShader,
      fragmentShader: `uniform sampler2D current, history;uniform vec2 texel,jitter;uniform float weight;varying vec2 vUv;
        void main(){
          vec2 p=vUv-jitter; vec3 color=texture2D(current,p).rgb;
          vec3 low=color, high=color;
          vec3 a=texture2D(current,p+vec2(texel.x,0.)).rgb;
          vec3 b=texture2D(current,p-vec2(texel.x,0.)).rgb;
          vec3 c=texture2D(current,p+vec2(0.,texel.y)).rgb;
          vec3 d=texture2D(current,p-vec2(0.,texel.y)).rgb;
          low=min(low,min(min(a,b),min(c,d)));high=max(high,max(max(a,b),max(c,d)));
          vec3 previous=clamp(texture2D(history,vUv).rgb,low,high);
          gl_FragColor=vec4(mix(color,previous,weight),1.);
        }`,
      depthTest: false, depthWrite: false, blending: THREE.NoBlending, toneMapped: false,
    });
    this.copy = new THREE.ShaderMaterial({uniforms:{source:{value:null}},vertexShader,
      fragmentShader:`uniform sampler2D source;varying vec2 vUv;void main(){gl_FragColor=texture2D(source,vUv);}`,
      depthTest:false,depthWrite:false,blending:THREE.NoBlending,toneMapped:false});
    this.quad = new FullScreenQuad(this.material);
  }
  setSize(w,h) {
    this.targets.forEach(t=>t.setSize(w,h));this.material.uniforms.texel.value.set(1/w,1/h);this.valid=false;
  }
  begin(camera) {
    this.valid &&= camera.position.distanceToSquared(this.position)<.0001
      && camera.quaternion.angleTo(this.quaternion)<.0005
      && Math.abs(camera.projectionMatrix.elements[8]-this.projection.elements[8])<.0005
      && Math.abs(camera.projectionMatrix.elements[9]-this.projection.elements[9])<.0005;
    this.position.copy(camera.position);this.quaternion.copy(camera.quaternion);this.projection.copy(camera.projectionMatrix);
    const i=(this.frame++%16)+1;
    this.jitter.set((halton(i,2)-.5)/this.targets[0].width,(halton(i,3)-.5)/this.targets[0].height);
    camera.projectionMatrix.elements[8]+=2*this.jitter.x;
    camera.projectionMatrix.elements[9]+=2*this.jitter.y;
    camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
  }
  resolve(renderer, model, camera) {
    camera.projectionMatrix.copy(this.projection);camera.projectionMatrixInverse.copy(this.projection).invert();
    const next=1-this.index;
    this.material.uniforms.current.value=model.texture;
    this.material.uniforms.history.value=this.targets[this.index].texture;
    this.material.uniforms.weight.value = this.valid ? .8 : 0;
    this.quad.material=this.material;renderer.setRenderTarget(this.targets[next]);this.quad.render(renderer);
    this.copy.uniforms.source.value=this.targets[next].texture;
    this.quad.material=this.copy;renderer.setRenderTarget(model);this.quad.render(renderer);
    this.index=next;this.valid=true;
  }
  dispose(){this.targets.forEach(t=>t.dispose());this.material.dispose();this.copy.dispose();this.quad.dispose();}
}
