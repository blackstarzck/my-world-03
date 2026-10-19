import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { GTAOPass } from "three/addons/postprocessing/GTAOPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { SMAAPass } from "three/addons/postprocessing/SMAAPass.js";
import { createMaterials } from "./materials.js";
import { buildArchitecture } from "./architecture.js";
import { buildExhibits } from "./exhibits.js";
import { navigation } from "./navigation.js";
import { lightingPresets, renderQuality } from "./render-settings.js";
import { createExhibitLighting } from "./exhibit-lighting.js";

export async function createExhibition(container, callbacks) {
  const manager = new THREE.LoadingManager();
  manager.onProgress = (_, loaded, total) =>
    callbacks.onProgress(Math.min(95, Math.round((loaded / total) * 90)));
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.shadowMap.autoUpdate = false;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.13;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.info.autoReset = false;
  renderer.domElement.tabIndex = 0;
  renderer.domElement.setAttribute(
    "aria-label",
    "3D 전시 공간. 드래그하여 둘러보고 방향키로 이동하세요.",
  );
  container.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#dddeda");
  const interiorFog = new THREE.Fog("#dddeda", 65, 180);
  scene.fog = interiorFog;
  const camera = new THREE.PerspectiveCamera(
    59,
    container.clientWidth / container.clientHeight,
    0.075,
    250,
  );
  const envScene = new RoomEnvironment(),
    pmrem = new THREE.PMREMGenerator(renderer),
    environment = pmrem.fromScene(envScene, 0.035);
  scene.environment = environment.texture;
  scene.environmentIntensity = 0.38;
  envScene.dispose();
  pmrem.dispose();
  const hemisphere = new THREE.HemisphereLight("#e9f2fa", "#aca18e", 0.48);
  scene.add(hemisphere);
  const sun = new THREE.DirectionalLight("#fff1d7", 3.8);
  sun.position.set(-35, 55, 30);
  sun.target.position.set(0, 0, -6);
  scene.add(sun, sun.target);
  sun.castShadow = true;
  Object.assign(sun.shadow.camera, {
    left: -47,
    right: 47,
    top: 47,
    bottom: -47,
    near: 1,
    far: 155,
  });
  sun.shadow.mapSize.set(4096, 4096);
  sun.shadow.bias = -0.00015;
  sun.shadow.normalBias = 0.018;
  let architecture,
    exhibits,
    nav,
    composer,
    ao,
    disposed = false,
    frame = 0,
    previous = performance.now(),
    lastPosition = 0,
    quality = "high",
    overviewMode = false,
    reducedQuality = false,
    lighting = "day",
    updateQuality,
    measuredFrames = 0,
    measuredTime = 0;
  const resize = (reframe = true) => {
    const w = container.clientWidth,
      h = container.clientHeight;
    if (!w || !h) return;
    const aspectChanged = Math.abs(camera.aspect - w / h) > 0.001;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    updateQuality?.();
    renderer.setSize(w, h);
    composer?.setSize(w, h);
    if (aspectChanged && reframe) nav?.reframeArtwork();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(container);
  function dispose() {
    if (disposed) return;
    disposed = true;
    cancelAnimationFrame(frame);
    observer.disconnect();
    nav?.dispose();
    composer?.passes.forEach((p) => p.dispose?.());
    composer?.dispose();
    const geometries = new Set(),
      materials = new Set(),
      textures = new Set();
    scene.traverse((o) => {
      if (o.geometry) geometries.add(o.geometry);
      for (const m of Array.isArray(o.material)
        ? o.material
        : o.material
          ? [o.material]
          : []) {
        materials.add(m);
        for (const value of Object.values(m))
          if (value?.isTexture) textures.add(value);
      }
    });
    geometries.forEach((g) => g.dispose());
    materials.forEach((m) => m.dispose());
    textures.forEach((t) => t.dispose());
    environment.dispose();
    sun.shadow.dispose();
    renderer.dispose();
    renderer.domElement.remove();
    if (import.meta.env.DEV) delete window.__TRIAD__;
  }
  try {
    const materials = await createMaterials(manager);
    architecture = buildArchitecture(scene, materials);
    exhibits = await buildExhibits(
      architecture.groups,
      materials,
      architecture.contactMat,
      manager,
    );
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    ao = new GTAOPass(
      scene,
      camera,
      container.clientWidth,
      container.clientHeight,
    );
    ao.blendIntensity = 0.68;
    ao.updateGtaoMaterial({
      radius: 0.38,
      distanceExponent: 1.2,
      thickness: 0.5,
      scale: 1,
      samples: 8,
    });
    ao.updatePdMaterial({
      lumaPhi: 10,
      depthPhi: 2,
      normalPhi: 3,
      radius: 4,
      rings: 2,
      samples: 8,
    });
    composer.addPass(ao);
    composer.addPass(new OutputPass());
    composer.addPass(new SMAAPass());
    nav = navigation(camera, renderer.domElement, {
      ...callbacks,
      selectable: exhibits.selectable,
    });
    const exhibitLighting = createExhibitLighting(
      scene,
      exhibits.lightingTargets,
    );
    exhibitLighting.update(camera);
    updateQuality = () => {
      quality = renderQuality(
        container.clientWidth,
        overviewMode,
        reducedQuality,
      );
      ao.enabled = quality === "high";
      const pixelRatio = Math.min(
        devicePixelRatio,
        quality === "high" ? 1.5 : 1,
      );
      if (renderer.getPixelRatio() !== pixelRatio) {
        renderer.setPixelRatio(pixelRatio);
        composer.setPixelRatio(pixelRatio);
      }
    };
    updateQuality();
    const applyLighting = (mode) => {
      lighting = mode;
      const preset = lightingPresets[mode];
      sun.intensity = preset.sun;
      sun.color.set(preset.sunColor);
      hemisphere.intensity = preset.hemisphere;
      scene.environmentIntensity = preset.environment;
      renderer.toneMappingExposure = preset.exposure;
      scene.background.set(preset.background);
      interiorFog.color.copy(scene.background);
      materials.skylight.emissiveIntensity = preset.skylightGlow;
      exhibitLighting.setIntensity(preset.spot);
      architecture.lights.forEach((light) => {
        light.intensity = light.userData.dayIntensity * preset.daylight;
      });
      // Only light intensity/color changes: the static shadow depth is reusable.
    };
    applyLighting("day");
    // Compile every room with the SAME fog/light configuration before entry.
    // Removing fog on the first overview used to compile a second set mid-frame.
    callbacks.onProgress(96);
    renderer.setRenderTarget(composer.readBuffer);
    await renderer.compileAsync(scene, camera);
    renderer.setRenderTarget(null);
    renderer.shadowMap.needsUpdate = true;
    composer.render();
    previous = performance.now();
    function animate(now) {
      if (disposed) return;
      frame = requestAnimationFrame(animate);
      const elapsed = now - previous;
      const dt = Math.min(elapsed / 1000, 0.05);
      previous = now;
      if (document.hidden) return;
      // Adapt once to sustained slow rendering, rather than requiring a settings modal.
      if (!reducedQuality && !overviewMode && elapsed < 250) {
        measuredTime += elapsed;
        if (++measuredFrames === 90) {
          reducedQuality = measuredTime / measuredFrames > 30;
          measuredFrames = measuredTime = 0;
          if (reducedQuality) updateQuality();
        }
      }
      nav.update(dt);
      if (now - lastPosition > 120) exhibitLighting.update(camera);
      renderer.info.reset();
      composer.render();
      if (now - lastPosition > 120) {
        callbacks.onPosition?.(nav.state());
        lastPosition = now;
      }
    }
    frame = requestAnimationFrame(animate);
    callbacks.onProgress(100);
    function setOverview(overview) {
      const roofChanged = overview !== overviewMode;
      overviewMode = overview;
      architecture.roofParts.forEach((p) => (p.visible = !overview));
      interiorFog.near = overview ? 1000 : 65;
      interiorFog.far = overview ? 2000 : 180;
      if (roofChanged) camera.fov = overview ? 48 : 59;
      camera.near = overview ? 0.5 : 0.075;
      camera.far = overview ? 800 : 250;
      camera.updateProjectionMatrix();
      updateQuality();
      if (roofChanged) renderer.shadowMap.needsUpdate = true;
    }
    const api = {
      goTo(id) {
        setOverview(id === "overview");
        camera.fov = id === "overview" ? 48 : 59;
        camera.updateProjectionMatrix();
        nav.goTo(id);
        exhibitLighting.update(camera);
      },
      getArtworks: () => exhibits.collection,
      focusArtwork(id) {
        const artwork = exhibits.collection.find((a) => a.id === id);
        if (!artwork) return;
        if (nav.state().overview) api.goTo(artwork.room);
        setOverview(false);
        // React has applied the 70:30 layout; use that viewport before planning.
        resize(false);
        nav.focusArtwork(artwork);
      },
      returnToEntrance(room) {
        setOverview(false);
        resize(false);
        nav.goTo(room, { animated: true });
      },
      startWalk() {
        if (nav.state().overview) api.goTo("lobby");
        return nav.startWalk();
      },
      setMove: (...args) => nav.setMove(...args),
      setSuspended: (v) => nav.setSuspended(v),
      setLighting: applyLighting,
      state: () => ({
        ...nav.state(),
        quality,
        lighting,
        aoEnabled: ao.enabled,
        roofVisible: architecture.roofParts.every((p) => p.visible),
        drawCalls: renderer.info.render.calls,
        shaderPrograms: renderer.info.programs.length,
        triangles: renderer.info.render.triangles,
        objects: scene.children.length,
        artworks: exhibits.pictures.length,
        artworkCount: exhibits.collection.length,
      }),
      dispose,
    };
    if (import.meta.env.DEV) window.__TRIAD__ = api;
    return api;
  } catch (error) {
    dispose();
    throw error;
  }
}
