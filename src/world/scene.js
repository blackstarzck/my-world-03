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
    quality = "high";
  const resize = () => {
    const w = container.clientWidth,
      h = container.clientHeight;
    if (!w || !h) return;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    composer?.setSize(w, h);
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
    renderer.shadowMap.needsUpdate = true;
    const applyQuality = (value) => {
      quality = value;
      ao.enabled = value === "high";
      renderer.setPixelRatio(
        Math.min(devicePixelRatio, value === "high" ? 1.5 : 1),
      );
      composer.setPixelRatio(renderer.getPixelRatio());
      resize();
    };
    applyQuality(window.innerWidth < 700 ? "balanced" : "high");
    function animate(now) {
      if (disposed) return;
      frame = requestAnimationFrame(animate);
      const dt = Math.min((now - previous) / 1000, 0.05);
      previous = now;
      if (document.hidden) return;
      nav.update(dt);
      renderer.info.reset();
      composer.render();
      if (now - lastPosition > 120) {
        callbacks.onPosition?.(nav.state());
        lastPosition = now;
      }
    }
    frame = requestAnimationFrame(animate);
    callbacks.onProgress(100);
    const api = {
      goTo(id) {
        const overview = id === "overview";
        architecture.roofParts.forEach((p) => (p.visible = !overview));
        scene.fog = overview ? null : interiorFog;
        camera.fov = overview ? 48 : 59;
        camera.near = overview ? 0.5 : 0.075;
        camera.far = overview ? 800 : 250;
        camera.updateProjectionMatrix();
        nav.goTo(id);
        renderer.shadowMap.needsUpdate = true;
      },
      startWalk() {
        if (nav.state().overview) api.goTo("lobby");
        return nav.startWalk();
      },
      setMove: (...args) => nav.setMove(...args),
      setSuspended: (v) => nav.setSuspended(v),
      setLighting(mode) {
        const night = mode === "evening";
        sun.intensity = night ? 0.5 : 3.8;
        sun.color.set(night ? "#efbd87" : "#fff1d7");
        hemisphere.intensity = night ? 0.22 : 0.48;
        scene.environmentIntensity = night ? 0.22 : 0.38;
        renderer.toneMappingExposure = night ? 1.16 : 1.13;
        scene.background.set(night ? "#6e7984" : "#dddeda");
        interiorFog.color.copy(scene.background);
        architecture.lights.forEach((l) => {
          l.intensity =
            l.userData.dayIntensity *
            (l.isSpotLight ? (night ? 1.5 : 1) : night ? 0.32 : 1);
        });
        renderer.shadowMap.needsUpdate = true;
      },
      setQuality: applyQuality,
      setExposure(value) {
        renderer.toneMappingExposure = value;
      },
      screenshot() {
        composer.render();
        const a = document.createElement("a");
        a.download = "triad-exhibition.png";
        a.href = renderer.domElement.toDataURL("image/png");
        a.click();
      },
      state: () => ({
        ...nav.state(),
        quality,
        roofVisible: architecture.roofParts.every((p) => p.visible),
        drawCalls: renderer.info.render.calls,
        triangles: renderer.info.render.triangles,
        objects: scene.children.length,
        artworks: exhibits.pictures.length,
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
