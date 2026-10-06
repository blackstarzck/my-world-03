import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { canStand, currentRoom, destinations } from "./layout.js";

export function navigation(
  camera,
  canvas,
  { onRoom, onLock, onSelect, selectable },
) {
  const orbit = new OrbitControls(camera, canvas);
  orbit.enabled = false;
  orbit.enableDamping = true;
  orbit.dampingFactor = 0.065;
  orbit.minDistance = 32;
  orbit.maxDistance = 125;
  orbit.maxPolarAngle = Math.PI * 0.47;
  let overview = false,
    drag = false,
    moved = 0,
    lastX = 0,
    lastY = 0,
    yaw = 0,
    pitch = 0,
    locked = false,
    room = "lobby",
    suspended = false;
  const keys = new Set(),
    euler = new THREE.Euler(0, 0, 0, "YXZ"),
    ray = new THREE.Raycaster();
  const listeners = [];
  const listen = (target, type, fn, opts) => {
    target.addEventListener(type, fn, opts);
    listeners.push(() => target.removeEventListener(type, fn, opts));
  };
  function syncAngles() {
    euler.setFromQuaternion(camera.quaternion, "YXZ");
    yaw = euler.y;
    pitch = euler.x;
  }
  function rotate(dx, dy) {
    yaw -= dx * 0.0023;
    pitch = THREE.MathUtils.clamp(pitch - dy * 0.0023, -1.15, 1.15);
    camera.quaternion.setFromEuler(euler.set(pitch, yaw, 0, "YXZ"));
  }
  function move(x, z) {
    const steps = Math.max(1, Math.ceil(Math.hypot(x, z) / 0.1));
    for (let i = 0; i < steps; i++) {
      if (canStand(camera.position.x + x / steps, camera.position.z))
        camera.position.x += x / steps;
      if (canStand(camera.position.x, camera.position.z + z / steps))
        camera.position.z += z / steps;
    }
  }
  function goTo(id) {
    keys.clear();
    overview = id === "overview";
    orbit.enabled = overview;
    orbit.maxDistance = Math.max(125, 125 / camera.aspect);
    const preset = destinations[id] || destinations.lobby;
    camera.position.fromArray(preset.position);
    camera.lookAt(
      ...(id === "lobby" && camera.aspect < 0.8 ? [0, 1.7, 0] : preset.target),
    );
    orbit.target.fromArray(preset.target);
    if (overview && camera.aspect < 1)
      camera.position
        .sub(orbit.target)
        .multiplyScalar(1 / camera.aspect)
        .add(orbit.target);
    syncAngles();
    room = overview ? "overview" : id;
    onRoom(room);
    if (locked) document.exitPointerLock();
  }
  function select(event) {
    if (overview || moved > 6 || suspended) return;
    const rect = canvas.getBoundingClientRect();
    const point = locked
      ? new THREE.Vector2(0, 0)
      : new THREE.Vector2(
          ((event.clientX - rect.left) / rect.width) * 2 - 1,
          (-(event.clientY - rect.top) / rect.height) * 2 + 1,
        );
    ray.setFromCamera(point, camera);
    const hit = ray
      .intersectObjects(selectable, false)
      .find((h) => h.distance < 8);
    if (hit?.object.userData.artwork) {
      if (locked) document.exitPointerLock();
      onSelect(hit.object.userData.artwork);
    }
  }
  listen(canvas, "pointerdown", (e) => {
    if (overview || suspended) return;
    drag = true;
    moved = 0;
    lastX = e.clientX;
    lastY = e.clientY;
    canvas.focus();
    if (!locked) canvas.setPointerCapture(e.pointerId);
  });
  listen(canvas, "pointermove", (e) => {
    if (overview || suspended) return;
    if (locked) {
      rotate(e.movementX, e.movementY);
      return;
    }
    if (!drag) return;
    const dx = e.clientX - lastX,
      dy = e.clientY - lastY;
    moved += Math.abs(dx) + Math.abs(dy);
    rotate(dx, dy);
    lastX = e.clientX;
    lastY = e.clientY;
  });
  listen(canvas, "pointerup", (e) => {
    if (drag) select(e);
    drag = false;
    if (canvas.hasPointerCapture(e.pointerId))
      canvas.releasePointerCapture(e.pointerId);
  });
  listen(canvas, "pointercancel", () => {
    drag = false;
    keys.clear();
  });
  listen(document, "pointerlockchange", () => {
    locked = document.pointerLockElement === canvas;
    drag = false;
    keys.clear();
    onLock(locked);
  });
  listen(window, "keydown", (e) => {
    if (
      suspended ||
      overview ||
      /INPUT|TEXTAREA|SELECT/.test(e.target.tagName) ||
      e.ctrlKey ||
      e.metaKey ||
      e.altKey
    )
      return;
    if (
      [
        "KeyW",
        "KeyA",
        "KeyS",
        "KeyD",
        "ArrowUp",
        "ArrowDown",
        "ArrowLeft",
        "ArrowRight",
        "ShiftLeft",
        "ShiftRight",
      ].includes(e.code)
    ) {
      keys.add(e.code);
      e.preventDefault();
    }
  });
  listen(window, "keyup", (e) => keys.delete(e.code));
  listen(window, "blur", () => {
    keys.clear();
    drag = false;
  });
  listen(document, "visibilitychange", () => {
    if (document.hidden) keys.clear();
  });
  listen(
    canvas,
    "wheel",
    (e) => {
      if (overview || suspended) return;
      e.preventDefault();
      const d = THREE.MathUtils.clamp(-e.deltaY * 0.006, -0.8, 0.8);
      move(-Math.sin(yaw) * d, -Math.cos(yaw) * d);
    },
    { passive: false },
  );
  goTo("lobby");
  return {
    goTo,
    startWalk: async () => {
      if (overview) goTo("lobby");
      suspended = false;
      canvas.focus();
      try {
        await canvas.requestPointerLock();
      } catch {
        onLock(false);
      }
    },
    setSuspended(value) {
      suspended = value;
      keys.clear();
      if (value && locked) document.exitPointerLock();
    },
    setMove(direction, pressed) {
      const codes = {
        forward: "KeyW",
        back: "KeyS",
        left: "KeyA",
        right: "KeyD",
      };
      if (pressed) keys.add(codes[direction]);
      else keys.delete(codes[direction]);
    },
    update(dt) {
      if (overview) {
        orbit.update();
        return;
      }
      if (!suspended) {
        let forward =
          Number(keys.has("KeyW") || keys.has("ArrowUp")) -
          Number(keys.has("KeyS") || keys.has("ArrowDown"));
        let right =
          Number(keys.has("KeyD") || keys.has("ArrowRight")) -
          Number(keys.has("KeyA") || keys.has("ArrowLeft"));
        const length = Math.hypot(forward, right);
        if (length) {
          const speed =
            ((keys.has("ShiftLeft") || keys.has("ShiftRight") ? 7.5 : 4.5) *
              dt) /
            length;
          move(
            (-Math.sin(yaw) * forward + Math.cos(yaw) * right) * speed,
            (-Math.cos(yaw) * forward - Math.sin(yaw) * right) * speed,
          );
          camera.position.y = 1.7;
        }
      }
      const next = currentRoom(camera.position.x, camera.position.z);
      if (next !== room) {
        room = next;
        onRoom(next);
      }
    },
    state: () => ({
      position: camera.position.toArray(),
      yaw,
      room,
      overview,
      locked,
    }),
    dispose() {
      listeners.forEach((f) => f());
      orbit.dispose();
      if (locked) document.exitPointerLock();
    },
  };
}
