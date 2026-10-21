import { Group } from "three";

// Three's compileAsync traverses hidden objects too. The optical source
// meshes belong to their own renderer and must never compile against all
// gallery lights. Keep every visible room's shaders, using the real scene's
// lighting, fog and environment, without moving any original objects.
export function warmGalleryShaders(renderer, scene, camera) {
  const visible = new Group();
  scene.traverseVisible((object) => {
    if (object.isMesh || object.isPoints || object.isLine || object.isSprite) {
      const proxy = object.clone(false);
      if (scene.overrideMaterial) proxy.material = scene.overrideMaterial;
      visible.add(proxy);
    }
  });
  return renderer.compileAsync(visible, camera, scene);
}

// Walk the actual passes once to discover their shader variants. Start all
// compilations together instead of blocking on each effect during the first
// real frame. No pixels are drawn or cleared during this discovery pass.
export async function warmFirstFrame(renderer, renderFrame) {
  const render = renderer.render, clear = renderer.clear;
  const target = renderer.getRenderTarget();
  const pending = [];
  let failure;
  try {
    renderer.render = (scene, camera) => {
      pending.push(scene.isScene
        ? warmGalleryShaders(renderer, scene, camera)
        : renderer.compileAsync(scene, camera));
    };
    renderer.clear = () => {};
    renderFrame();
  } catch (error) {
    failure = error;
  } finally {
    renderer.render = render;
    renderer.clear = clear;
    renderer.setRenderTarget(target);
  }
  const results = await Promise.allSettled(pending);
  if (failure) throw failure;
  const rejected = results.find(result => result.status === "rejected");
  if (rejected) throw rejected.reason;
}
