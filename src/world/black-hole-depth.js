import * as THREE from "three";

// Source TextureDepth stores the nearest surface's opacity alongside depth.
// In particular, the zero-opacity distortion shell must not generate bloom.
export class BlackHoleDepth {
  constructor(sources, camera) {
    this.camera = camera;
    this.scene = new THREE.Scene();
    this.meshes = sources.map(({ source }) => {
      const settings = source.material.userData.sketchfab;
      const opacity = settings.Opacity, mask = settings.AlphaMask;
      const maskMap = mask.enable ? source.material.alphaMap : null;
      const opacityMap = opacity.enable
        ? source.material.sourceOpacityMap ?? source.material.alphaMap : null;
      const material = new THREE.ShaderMaterial({
        uniforms: {
          maskMap: { value: maskMap }, opacityMap: { value: opacityMap },
          maskTransform: { value: maskMap?.matrix ?? new THREE.Matrix3() },
          opacityTransform: { value: opacityMap?.matrix ?? new THREE.Matrix3() },
          opacity: { value: opacity.enable ? opacity.factor : 1 },
          cutoff: { value: mask.enable ? mask.factor : 0 },
        },
        defines: { ...(maskMap ? { HAS_MASK: "" } : {}), ...(opacityMap ? { HAS_OPACITY: "" } : {}) },
        vertexShader: /* glsl */ `
          varying vec2 vUv;
          void main() { vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }
        `,
        fragmentShader: /* glsl */ `
          uniform sampler2D maskMap, opacityMap;
          uniform mat3 maskTransform, opacityTransform;
          uniform float opacity, cutoff;
          varying vec2 vUv;
          void main() {
            #ifdef HAS_MASK
              if (texture2D(maskMap,(maskTransform*vec3(vUv,1.0)).xy).a < cutoff) discard;
            #endif
            float coverage=opacity;
            #ifdef HAS_OPACITY
              coverage*=texture2D(opacityMap,(opacityTransform*vec3(vUv,1.0)).xy).a;
            #endif
            gl_FragColor=vec4(0.0,0.0,0.0,coverage);
          }
        `,
        side: THREE.FrontSide, depthWrite: true, depthTest: true,
        blending: THREE.NoBlending, toneMapped: false,
      });
      const mesh = new THREE.Mesh(source.geometry, material);
      mesh.matrixAutoUpdate = false;
      this.scene.add(mesh);
      return { source, mesh };
    });
    this.target = new THREE.WebGLRenderTarget(256,256);
    this.target.depthTexture = new THREE.DepthTexture(256,256);
  }

  setSize(width,height) { this.target.setSize(width,height); }
  render(renderer) {
    for (const {source,mesh} of this.meshes) mesh.matrix.copy(source.matrixWorld);
    renderer.setRenderTarget(this.target);
    renderer.clear();
    renderer.render(this.scene,this.camera);
  }
  dispose() { this.target.dispose();this.meshes.forEach(({mesh})=>mesh.material.dispose()); }
}
