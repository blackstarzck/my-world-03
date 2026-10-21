import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { GalleryRenderPass } from "./gallery-render.js";
import { GalleryAOPass } from "./gallery-ao.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { SMAAPass } from "three/addons/postprocessing/SMAAPass.js";
import { createMaterials } from "./materials.js";
import { buildArchitecture } from "./architecture.js";
import { buildExhibits, loadExhibitAssets } from "./exhibits.js";
import { navigation } from "./navigation.js";
import { renderQuality } from "./render-settings.js";
import { createExhibitLighting } from "./exhibit-lighting.js";
import { surfaceProjection } from "./surface-projection.js";
import { createNearbyArtworkTracker } from "./nearby-artwork.js";
import { createGalleryLighting } from "./gallery-lighting.js";
import { createBlackHoleMotion } from "./black-hole-motion.js";
import { createBlackHoleBloom } from "./black-hole-bloom.js";
import { createRenderDiagnostics } from "./render-diagnostics.js";
import { warmFirstFrame } from "./shader-warmup.js";
import { configureGalleryLightLoops } from "./gallery-light-loops.js";
import { loadGalleryEnvironment } from "./gallery-environment.js";

export async function createExhibition(container, callbacks) {
  const manager = new THREE.LoadingManager();
  const timings = {};
  const started = performance.now();
  const stage = (id, label) => {
    timings[id] = Math.round(performance.now() - started);
    callbacks.onLoadStage?.(label);
  };
  stage("start", "전시 공간을 준비하고 있어요");
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
    "3D 포트폴리오. 드래그하여 둘러보고 방향키로 이동하세요.",
  );
  container.appendChild(renderer.domElement);
  const diagnostics = createRenderDiagnostics(container);
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
  scene.environmentIntensity = 0.38;
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
  let environment,
    architecture,
    exhibits,
    nav,
    composer,
    beauty,
    ao,
    blackHoleMotion,
    blackHoleBloom,
    disposed = false,
    frame = 0,
    previous = performance.now(),
    lastPosition = 0,
    quality = "high",
    overviewMode = false,
    reducedQuality = false,
    lighting = "day",
    surfaceTracker = null,
    presentationActive = false,
    lastPresentationPose = "",
    updateQuality,
    measuredFrames = 0,
    measuredTime = 0;
  const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
  const resizeBloom = () => blackHoleBloom?.resize(
    container.clientWidth, container.clientHeight, renderer.getPixelRatio(), quality,
  );
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
    resizeBloom();
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
    exhibits?.blackHole.userData.spaceEnvironment?.dispose();
    environment?.dispose();
    sun.shadow.dispose();
    renderer.dispose();
    renderer.domElement.remove();
    diagnostics.dispose();
    container.parentElement?.style.removeProperty("--black-hole-immersion");
    container.parentElement?.classList.remove("black-hole-immersed");
    if (import.meta.env.DEV) delete window.__TRIAD__;
  }
  try {
    stage("assets", "그림과 공간 재질을 불러오고 있어요");
    const [materials, exhibitAssets, environmentMap] = await Promise.all([
      createMaterials(manager), loadExhibitAssets(manager), loadGalleryEnvironment(manager),
    ]);
    environment = environmentMap;
    scene.environment = environment;
    stage("architecture", "전시 공간을 구성하고 있어요");
    architecture = buildArchitecture(scene, materials);
    stage("exhibits", "작품과 블랙홀을 배치하고 있어요");
    exhibits = await buildExhibits(
      architecture.groups,
      materials,
      architecture.contactMat,
      manager,
      { assets: exhibitAssets },
    );
    blackHoleMotion = createBlackHoleMotion(exhibits.blackHole);
    blackHoleBloom = createBlackHoleBloom(exhibits.blackHole, camera);
    composer = new EffectComposer(renderer);
    beauty = new GalleryRenderPass(scene, camera);
    composer.addPass(beauty);
    ao = new GalleryAOPass(
      scene,
      camera,
      container.clientWidth,
      container.clientHeight,
      [exhibits.blackHole],
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
    composer.addPass(blackHoleBloom.pass);
    const output = new OutputPass();
    blackHoleBloom.attachOutput(output);
    composer.addPass(output);
    composer.addPass(new SMAAPass());
    nav = navigation(camera, renderer.domElement, {
      ...callbacks,
      selectable: exhibits.selectable,
      externalExhibit: {
        hitTest: (point) => blackHoleBloom.hitTest(point),
        url: "https://www.kchanchan.com/",
        onHover: callbacks.onBlackHoleHover,
      },
    });
    const nearbyArtwork = createNearbyArtworkTracker(exhibits.collection, scene);
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
      beauty.setSamples(quality === "high" ? Math.min(2, renderer.capabilities.maxSamples) : 0);
      const pixelRatio = Math.min(
        devicePixelRatio,
        quality === "high" ? 1.5 : 1,
      );
      if (renderer.getPixelRatio() !== pixelRatio) {
        renderer.setPixelRatio(pixelRatio);
        composer.setPixelRatio(pixelRatio);
      }
      resizeBloom();
    };
    updateQuality();
    const galleryLighting = createGalleryLighting({
      scene, renderer, sun, hemisphere, materials, architecture, exhibitLighting,
    });
    const applyLighting = (mode) => {
      lighting = mode;
      galleryLighting.update(lighting, blackHoleMotion.expansion);
    };
    applyLighting("day");
    configureGalleryLightLoops(scene);
    stage("shaders", "빛과 그림자를 준비하고 있어요");
    blackHoleBloom.setDepthTexture(beauty.target.depthTexture);
    blackHoleBloom.update(blackHoleMotion.activation, overviewMode);
    const buffers = [composer.readBuffer, composer.writeBuffer];
    const temporal = blackHoleBloom.pass.antialias;
    const history = { frame: temporal.frame, index: temporal.index, valid: temporal.valid };
    try {
      await warmFirstFrame(renderer, () => composer.render());
    } finally {
      [composer.readBuffer, composer.writeBuffer] = buffers;
      Object.assign(temporal, history);
    }
    stage("firstFrame", "첫 화면을 완성하고 있어요");
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
          reducedQuality = measuredTime / measuredFrames > 20;
          measuredFrames = measuredTime = 0;
          if (reducedQuality) updateQuality();
        }
      }
      nav.update(dt);
      blackHoleMotion.update(dt, camera.position, {
        overview: overviewMode,
        reducedMotion: motionPreference.matches,
      });
      galleryLighting.update(lighting, blackHoleMotion.expansion);
      blackHoleBloom.update(blackHoleMotion.activation, overviewMode);
      container.parentElement?.style.setProperty("--black-hole-immersion", blackHoleBloom.immersion);
      container.parentElement?.classList.toggle("black-hole-immersed", blackHoleBloom.immersion > .65);
      if (now - lastPosition > 120) exhibitLighting.update(camera);
      renderer.info.reset();
      // Keep the stationary gallery from competing with an embedded app or index.
      const presentationPose = [
        ...camera.position.toArray(),
        ...camera.quaternion.toArray(),
        camera.fov,
        camera.aspect,
        quality,
        lighting,
        overviewMode,
        container.clientWidth,
        container.clientHeight,
      ].join(":");
      if (
        !presentationActive ||
        nav.state().moving ||
        presentationPose !== lastPresentationPose
      ) {
        const renderStart = performance.now();
        composer.render();
        diagnostics.record(elapsed, performance.now() - renderStart, renderer, {
          quality, dpr: renderer.getPixelRatio(), bloom: blackHoleBloom.pass.enabled,
          distance: +camera.position.distanceTo(exhibits.blackHole.position).toFixed(2),
          activation: +blackHoleMotion.activation.toFixed(2),
          ...blackHoleBloom.diagnostics(),
        });
        lastPresentationPose = presentationPose;
      }
      if (surfaceTracker)
        surfaceTracker.callback(
          surfaceProjection(surfaceTracker.artwork, camera, {
            width: container.clientWidth,
            height: container.clientHeight,
          }),
        );
      if (now - lastPosition > 120) {
        const state = nav.state();
        if (state.moving || presentationActive) nearbyArtwork.reset();
        else callbacks.onNearbyArtwork?.(
          state.overview ? null : nearbyArtwork.update(camera, state.room),
        );
        callbacks.onPosition?.(state);
        lastPosition = now;
      }
    }
    frame = requestAnimationFrame(animate);
    stage("ready", "준비가 끝났어요");
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
      captureView: () => nav.captureView(),
      restoreView(view) {
        setOverview(view.overview);
        resize(false);
        nav.restoreView(view);
        exhibitLighting.update(camera);
      },
      trackArtworkSurface(id, callback) {
        const artwork = exhibits.collection.find((item) => item.id === id);
        if (!artwork) return () => {};
        const tracker = { artwork, callback };
        surfaceTracker = tracker;
        return () => {
          if (surfaceTracker === tracker) surfaceTracker = null;
        };
      },
      focusArtwork(id, options) {
        const artwork = exhibits.collection.find((a) => a.id === id);
        if (!artwork) return;
        if (nav.state().overview) api.goTo(artwork.room);
        setOverview(false);
        // Keep the full gallery viewport during the approach and frontal hold.
        resize(false);
        nav.focusArtwork(artwork, options);
      },
      startWalk() {
        if (nav.state().overview) api.goTo("lobby");
        return nav.startWalk();
      },
      setMove: (...args) => nav.setMove(...args),
      setSuspended(v, options) {
        presentationActive = Boolean(v);
        nav.setSuspended(v, options);
      },
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
        loadingTimings: { ...timings },
        blackHole: {
          ...blackHoleMotion.state(),
          bloomEnabled: blackHoleBloom.pass.enabled,
        },
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
