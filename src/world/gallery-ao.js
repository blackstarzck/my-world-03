import { GTAOPass } from "three/addons/postprocessing/GTAOPass.js";

// GTAO's override material ignores an effect mesh's alpha maps and visibility
// material. Never let luminous sheets become solid triangles in its G-buffer.
export class GalleryAOPass extends GTAOPass {
  constructor(scene, camera, width, height, effects = []) {
    super(scene, camera, width, height);
    this.effects = effects;
  }

  render(...args) {
    const visibility = this.effects.map((effect) => effect.visible);
    try {
      this.effects.forEach((effect) => { effect.visible = false; });
      super.render(...args);
    } finally {
      this.effects.forEach((effect, index) => { effect.visible = visibility[index]; });
    }
  }
}
