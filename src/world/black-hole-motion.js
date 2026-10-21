import * as THREE from "three";

export const blackHoleInteraction = {
  wakeDistance: 7.5,
  fullDistance: 2.8,
  clickDistance: 4,
  maxScale: 1.85,
};

export function blackHoleActivation(distance) {
  return 1 - THREE.MathUtils.smoothstep(
    distance,
    blackHoleInteraction.fullDistance,
    blackHoleInteraction.wakeDistance,
  );
}

export function createBlackHoleMotion(exhibit) {
  const origin = exhibit.position.clone();
  const orientation = exhibit.rotation.clone();
  const disk = exhibit.getObjectByName("black_hole_ring");
  const inner = exhibit.getObjectByName("black_hole");
  const luminous = new Map();
  const flowing = new Map();
  exhibit.traverse((object) => {
    if (!object.isMesh) return;
    for (const material of Array.isArray(object.material)
      ? object.material : [object.material]) {
      if (!/^(ring2?|black_hole_light[123])$/.test(material.name)) continue;
      luminous.set(material, material.emissiveIntensity);
      for (const texture of [material.map, material.emissiveMap, material.alphaMap]) {
        if (!texture || flowing.has(texture)) continue;
        if (texture.wrapS !== THREE.RepeatWrapping) {
          texture.wrapS = THREE.RepeatWrapping;
          texture.needsUpdate = true;
        }
        flowing.set(texture, {
          offset: texture.offset.x,
          speed: material.name.startsWith("ring") ? 1 : -0.65,
        });
      }
    }
  });
  const state = {
    distance: Infinity,
    activation: 0,
    expansion: 0,
    scale: 1,
    height: origin.y,
    glow: 1,
    phase: 0,
    flow: 0,
  };
  let time = 0;

  return {
    get activation() { return state.activation; },
    get expansion() { return state.expansion; },
    update(dt, viewer, { overview = false, reducedMotion = false } = {}) {
      const delta = Number.isFinite(dt) ? THREE.MathUtils.clamp(dt, 0, 0.1) : 0;
      // Ground distance keeps the response independent of camera pitch or height.
      state.distance = Math.hypot(viewer.x - origin.x, viewer.z - origin.z);
      const target = overview ? 0 : blackHoleActivation(state.distance);
      const rate = target > state.activation ? 1.45 : 0.95;
      state.activation = THREE.MathUtils.damp(state.activation, target, rate, delta);
      const active = state.activation;
      const motion = !overview && !reducedMotion;
      if (motion) {
        time += delta;
        state.phase = (state.phase + delta * (0.045 + active * 0.23)) % (Math.PI * 2);
        state.flow += delta * (0.012 + active * 0.07);
        if (disk) disk.rotateZ(delta * (0.045 + active * 0.23));
        if (inner) inner.rotateZ(-delta * (0.016 + active * 0.06));
      }
      const breath = motion
        ? Math.sin(time * 1.15) * 0.7 + Math.sin(time * 0.47) * 0.3 : 0;
      const expansion = THREE.MathUtils.smoothstep(active, 0.12, 1);
      state.expansion = expansion;
      state.scale = (1 + (blackHoleInteraction.maxScale - 1) * expansion)
        * (1 + breath * 0.02 * active);
      // Expansion and pulse share a fixed center, so visitors can keep looking level.
      state.height = origin.y;
      state.glow = 1 + active * 0.08 + breath * active * 0.015;
      exhibit.scale.setScalar(state.scale);
      exhibit.position.y = state.height;
      exhibit.rotation.set(
        orientation.x + Math.sin(time * 0.27) * 0.013 * active,
        orientation.y + Math.sin(time * 0.18) * 0.035 * active,
        orientation.z + Math.sin(time * 0.31) * 0.018 * active,
      );
      for (const [material, intensity] of luminous)
      {
        material.emissiveIntensity = intensity * state.glow;
        if (material.userData.blackHoleFlow)
          material.userData.blackHoleFlow.value = state.flow;
      }
      for (const [texture, { offset, speed }] of flowing)
        texture.offset.x = offset + (state.flow * speed) % 1;
    },
    state: () => ({ ...state }),
  };
}
