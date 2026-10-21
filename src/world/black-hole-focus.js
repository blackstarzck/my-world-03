import * as THREE from "three";
import { FullScreenQuad } from "three/addons/postprocessing/Pass.js";

const vertexShader = `varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}`;
const cocShader = /* glsl */ `
  uniform sampler2D sceneDepth;
  uniform vec2 nearFar, blurNearFar, footprint;
  uniform float focusDistance;
  float circleOfConfusion(vec2 uv) {
    float z = texture2D(sceneDepth, uv).r;
    if (z >= 1.0) return max(blurNearFar.x, blurNearFar.y);
    float distance = nearFar.x * nearFar.y / (nearFar.y - z * (nearFar.y - nearFar.x));
    // Source depth and focus are both normalized after subtracting near.
    float coc = clamp((distance - focusDistance) / max(distance - nearFar.x, .00001), -1.0, 1.0);
    return coc * (coc < 0.0 ? blurNearFar.x : blurNearFar.y);
  }
  float foregroundCoC(vec2 uv) {
    float coc = circleOfConfusion(uv);
    for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++)
      coc = min(coc, circleOfConfusion(uv + vec2(float(x),float(y)) * footprint));
    return coc;
  }
`;
const taps = [
  [.3432802,.9211919],[-.1168591,.8730568],[-.6464213,.7604253],[-.0437332,.4719672],
  [.4824047,.4648946],[-.7188972,.3521913],[-.9390614,-.0387377],[.5465695,-.0169517],
  [-.1826441,-.0702668],[-.5761913,-.2523690],[.9219140,-.3665302],[.2381925,-.4160759],
  [-.1788904,-.6853874],[-.7491677,-.6751447],[.5986589,-.7972869],[.0600899,-.9525686],
];

// The authored focus filter precedes bloom. Its CoC-weighted disk keeps fine
// foreground strands soft without applying a blur to the gallery behind them.
export class BlackHoleFocus {
  constructor(settings) {
    this.target = new THREE.WebGLRenderTarget(128, 128, { type: THREE.HalfFloatType, depthBuffer: false });
    this.uniforms = {
      source: { value: null }, sceneDepth: { value: null }, blurred: { value: this.target.texture },
      nearFar: { value: new THREE.Vector2() }, focusDistance: { value: 1 },
      blurNearFar: { value: new THREE.Vector2(settings.blurNear, settings.blurFar) },
      footprint: { value: new THREE.Vector2() }, texel: { value: new THREE.Vector2() },
    };
    const options = { uniforms: this.uniforms, vertexShader, depthTest: false, depthWrite: false,
      blending: THREE.NoBlending, toneMapped: false };
    this.blur = new THREE.ShaderMaterial({ ...options,
      fragmentShader: /* glsl */ `
        uniform sampler2D source; varying vec2 vUv;
        ${cocShader}
        void main() {
          float coc = abs(foregroundCoC(vUv));
          vec2 radius = footprint * coc;
          vec4 sum = vec4(0.0);
          ${taps.map(([x,y]) => `{
            vec2 p = vUv + radius * vec2(${x},${y});
            float weight = max(.000001, pow(abs(circleOfConfusion(p)), 3.0));
            sum += vec4(texture2D(source,p).rgb,1.0) * weight;
          }`).join("\n")}
          gl_FragColor = vec4(sum.rgb / sum.a, 1.0);
        }
      `,
    });
    this.combine = new THREE.ShaderMaterial({ ...options,
      fragmentShader: /* glsl */ `
        uniform sampler2D source, blurred; uniform vec2 texel; varying vec2 vUv;
        ${cocShader}
        void main() {
          vec3 sharp = texture2D(source,vUv).rgb;
          vec3 soft = texture2D(blurred,vUv).rgb;
          soft += texture2D(blurred,vUv+texel).rgb;
          soft += texture2D(blurred,vUv-texel).rgb;
          soft += texture2D(blurred,vUv+vec2(texel.x,-texel.y)).rgb;
          soft += texture2D(blurred,vUv+vec2(-texel.x,texel.y)).rgb;
          float amount = smoothstep(.05,.3,abs(foregroundCoC(vUv)));
          gl_FragColor = vec4(mix(sharp,soft*.2,amount),1.0);
        }
      `,
    });
    this.quad = new FullScreenQuad(this.blur);
  }

  setSize(width, height) {
    this.target.setSize(Math.max(1,Math.round(width/2)),Math.max(1,Math.round(height/2)));
    // MAX_BLUR(16) * source viewport scale(.0015 * height), expressed in UV.
    this.uniforms.footprint.value.set(.024 * height / width,.024);
    this.uniforms.texel.value.set(.0015 * height / width,.0015);
  }

  render(renderer, model, unfiltered, camera, focusDistance, sourceDepth) {
    if (!sourceDepth || unfiltered === model.texture || sourceDepth === model.depthTexture)
      throw new Error("Black-hole focus requires independent color and depth inputs");
    this.uniforms.source.value = unfiltered;
    this.uniforms.sceneDepth.value = sourceDepth;
    this.uniforms.nearFar.value.set(camera.near,camera.far);
    this.uniforms.focusDistance.value = focusDistance;
    this.quad.material = this.blur;
    renderer.setRenderTarget(this.target); this.quad.render(renderer);
    this.quad.material = this.combine;
    renderer.setRenderTarget(model); this.quad.render(renderer);
  }

  dispose() { this.target.dispose(); this.blur.dispose(); this.combine.dispose(); this.quad.dispose(); }
}
