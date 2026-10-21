import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { currentRoom, destinations } from "./layout.js";
import { artworkApproach, returnMotion } from "./artwork-approach.js";
import { artworkView } from "./artwork-view.js";
import { clearSegment, planRoute } from "./camera-route.js";
import { createCameraMotion, createFramingMotion, reverseFramingMotion, sampleCameraMotion } from "./camera-motion.js";

export function navigation(
  camera,
  canvas,
  { onRoom, onLock, onSelect, onTravel, onTravelProgress, selectable, externalExhibit },
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
    suspended = false,
    motion = null,
    focusedArtwork = null,
    pausedAt = null,
    pointerId = null,
    hoverPosition = null,
    exhibitHovered = false,
    hoverElapsed = 0;
  const keys = new Set(),
    inspections = new WeakMap(),
    euler = new THREE.Euler(0, 0, 0, "YXZ"),
    ray = new THREE.Raycaster();
  const listeners = [];
  const listen = (target, type, fn, opts) => {
    target.addEventListener(type, fn, opts);
    listeners.push(() => target.removeEventListener(type, fn, opts));
  };
  function setExhibitHovered(value) {
    if (value === exhibitHovered) return;
    exhibitHovered = value;
    canvas.style.cursor = value ? "pointer" : "";
    externalExhibit?.onHover?.(value);
  }
  function pointerPoint(clientX, clientY) {
    if (locked) return new THREE.Vector2(0, 0);
    const rect = canvas.getBoundingClientRect();
    return new THREE.Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      (-(clientY - rect.top) / rect.height) * 2 + 1,
    );
  }
  function updateExhibitHover(dt) {
    if (!externalExhibit) return;
    if (overview || suspended || motion || drag || (!locked && !hoverPosition)) {
      setExhibitHovered(false);
      return;
    }
    // Recheck while walking even when the mouse stays still, without
    // raycasting the detailed model on every animation frame.
    hoverElapsed += dt;
    if (hoverElapsed < .12) return;
    hoverElapsed = 0;
    setExhibitHovered(externalExhibit.hitTest(pointerPoint(
      hoverPosition?.x ?? 0, hoverPosition?.y ?? 0)));
  }
  function syncAngles() {
    euler.setFromQuaternion(camera.quaternion, "YXZ");
    yaw = euler.y;
    pitch = euler.x;
  }
  function rotate(dx, dy) {
    if (!dx && !dy) return;
    focusedArtwork = null;
    yaw -= dx * 0.0023;
    pitch = THREE.MathUtils.clamp(pitch - dy * 0.0023, -1.15, 1.15);
    camera.quaternion.setFromEuler(euler.set(pitch, yaw, 0, "YXZ"));
  }
  function move(x, z) {
    if (!x && !z) return;
    focusedArtwork = null;
    const steps = Math.max(1, Math.ceil(Math.hypot(x, z) / 0.1));
    for (let i = 0; i < steps; i++) {
      if (clearSegment(camera.position.toArray(), [camera.position.x + x / steps, camera.position.y, camera.position.z]))
        camera.position.x += x / steps;
      if (clearSegment(camera.position.toArray(), [camera.position.x, camera.position.y, camera.position.z + z / steps]))
        camera.position.z += z / steps;
    }
  }
  function applyPose(pose) {
    camera.position.fromArray(pose.position);
    const direction = new THREE.Vector3(
      Math.sin(pose.yaw) * Math.cos(pose.pitch),
      Math.sin(pose.pitch),
      Math.cos(pose.yaw) * Math.cos(pose.pitch),
    );
    camera.lookAt(direction.add(camera.position));
    camera.fov = pose.fov;
    camera.updateProjectionMatrix();
    syncAngles();
  }
  function cameraPose() {
    return {
      position: camera.position.toArray(),
      target: camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(5).add(camera.position).toArray(),
      fov: camera.fov,
    };
  }
  function play(path, returning = false, complete = null, entry = null) {
    setExhibitHovered(false);
    keys.clear();
    drag = false;
    if (pointerId !== null && canvas.hasPointerCapture?.(pointerId)) canvas.releasePointerCapture(pointerId);
    pointerId = null;
    orbit.enabled = false;
    if (locked) document.exitPointerLock();
    motion = { path, start: performance.now(), returning, complete, entry };
    if (pausedAt !== null) pausedAt = motion.start;
    if (!path.duration || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      applyPose(sampleCameraMotion(path, path.duration));
      if (entry) entry.elapsed = path.duration;
      motion = null;
      complete?.();
    }
    onTravelProgress?.(motion ? 0 : 1);
    onTravel?.(Boolean(motion));
  }
  function travel(pose, returning = false, complete = null) {
    const from = cameraPose();
    play(createCameraMotion(planRoute(from.position, pose.position), from.target,
      pose.target, from.fov, pose.fov, returning), returning, complete);
  }
  function focusArtwork(artwork, { origin, animated = true } = {}) {
    overview = false;
    focusedArtwork = artwork;
    if (!animated) {
      if (origin) inspections.delete(origin);
      const view = artworkView(artwork, camera.aspect);
      play(createFramingMotion(view, view));
      room = currentRoom(camera.position.x, camera.position.z);
      onRoom(room);
      return;
    }
    const path = artworkApproach(cameraPose(), artwork, camera.aspect);
    let entry = null;
    if (origin && !inspections.has(origin)) {
      entry = { path, elapsed: 0 };
      inspections.set(origin, entry);
    }
    play(path, false, null, entry);
  }
  function captureView() {
    return {
      position: camera.position.toArray(),
      quaternion: camera.quaternion.toArray(),
      target: camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(5).add(camera.position).toArray(),
      fov: camera.fov,
      aspect: camera.aspect,
      room,
      overview,
      orbitTarget: orbit.target.toArray(),
      artwork: motion ? null : focusedArtwork,
    };
  }
  function restoreView(view) {
    keys.clear();
    drag = false;
    focusedArtwork = null;
    const finalFov = () => {
      if (!view.artwork || Math.abs(view.aspect - camera.aspect) < 0.001) return view.fov;
      const distance = Math.hypot(...view.position.map((value, i) => value - view.artwork.target[i]));
      return Math.max(view.fov, 2 * Math.atan(Math.max(
        view.artwork.height / (2 * distance * 0.8),
        view.artwork.width / (2 * distance * camera.aspect * 0.8),
      )) * 180 / Math.PI);
    };
    const complete = () => {
      camera.position.fromArray(view.position);
      camera.quaternion.fromArray(view.quaternion);
      camera.fov = finalFov();
      camera.updateProjectionMatrix();
      syncAngles();
      focusedArtwork = view.artwork;
      room = view.room;
      onRoom(room);
    };
    if (view.overview) {
      // Drain residual orbit damping before restoring the saved aerial pose.
      orbit.enableDamping = false;
      orbit.update();
      orbit.enableDamping = true;
      orbit.target.fromArray(view.orbitTarget);
      overview = true;
      motion = null;
      complete();
      orbit.enabled = !suspended && pausedAt === null;
      onTravelProgress?.(1);
      onTravel?.(false);
    } else {
      overview = false;
      const from = cameraPose(), to = { position: view.position, target: view.target, fov: finalFov() };
      const entry = inspections.get(view);
      inspections.delete(view);
      let path;
      if (entry?.path.kind === "framing") {
        const last = sampleCameraMotion(entry.path, entry.elapsed);
        const direction = new THREE.Vector3(
          Math.sin(last.yaw) * Math.cos(last.pitch), Math.sin(last.pitch),
          Math.cos(last.yaw) * Math.cos(last.pitch));
        // Only replay the entry if still on it. After next/previous or resize,
        // return directly from the actual pose instead of jumping to an old one.
        if (camera.position.distanceTo(new THREE.Vector3(...last.position)) < 1e-6 &&
            camera.getWorldDirection(new THREE.Vector3()).distanceTo(direction) < 1e-6 &&
            Math.abs(camera.fov - last.fov) < 1e-6)
          path = reverseFramingMotion(entry.path, entry.elapsed, to.fov);
      }
      play(path || returnMotion(from, to), true, complete);
    }
  }
  function goTo(id, { animated = false } = {}) {
    setExhibitHovered(false);
    keys.clear();
    drag = false;
    if (pointerId !== null && canvas.hasPointerCapture?.(pointerId)) canvas.releasePointerCapture(pointerId);
    pointerId = null;
    focusedArtwork = null;
    overview = id === "overview";
    orbit.maxDistance = Math.max(125, 125 / camera.aspect);
    const preset = destinations[id] || destinations.lobby;
    if (animated && !overview) {
      travel({ ...preset, fov: 59 }, true);
      return;
    }
    motion = null;
    onTravelProgress?.(1);
    onTravel?.(false);
    orbit.enabled = overview;
    camera.position.fromArray(preset.position);
    camera.lookAt(...preset.target);
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
    if (overview || moved > 6 || suspended || motion) return;
    const point = pointerPoint(event.clientX, event.clientY);
    ray.setFromCamera(point, camera);
    const hit = ray
      .intersectObjects(selectable, false)
      .find((h) => h.distance < 8);
    if (hit?.object.userData.artwork) {
      if (locked) document.exitPointerLock();
      onSelect(hit.object.userData.artwork);
    } else if (externalExhibit?.hitTest(point)) {
      setExhibitHovered(false);
      if (locked) document.exitPointerLock();
      window.open(externalExhibit.url, "_blank", "noopener,noreferrer");
    }
  }
  listen(canvas, "pointerdown", (e) => {
    if (overview || suspended || motion) return;
    setExhibitHovered(false);
    drag = true;
    moved = 0;
    lastX = e.clientX;
    lastY = e.clientY;
    canvas.focus();
    if (!locked) canvas.setPointerCapture(e.pointerId);
    pointerId = e.pointerId;
  });
  listen(canvas, "pointermove", (e) => {
    hoverPosition = e.pointerType === "touch" ? null : { x: e.clientX, y: e.clientY };
    if (overview || suspended || motion) return;
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
  listen(canvas, "pointerleave", () => {
    hoverPosition = null;
    setExhibitHovered(false);
  });
  listen(canvas, "pointerup", (e) => {
    if (drag) select(e);
    drag = false;
    if (canvas.hasPointerCapture(e.pointerId))
      canvas.releasePointerCapture(e.pointerId);
    pointerId = null;
  });
  listen(canvas, "pointercancel", () => {
    hoverPosition = null;
    setExhibitHovered(false);
    drag = false;
    pointerId = null;
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
      motion ||
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
    hoverPosition = null;
    setExhibitHovered(false);
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
      if (overview || suspended || motion) return;
      e.preventDefault();
      const d = THREE.MathUtils.clamp(-e.deltaY * 0.006, -0.8, 0.8);
      move(-Math.sin(yaw) * d, -Math.cos(yaw) * d);
    },
    { passive: false },
  );
  goTo("lobby");
  return {
    goTo,
    captureView,
    restoreView,
    focusArtwork,
    reframeArtwork() {
      if (focusedArtwork && pausedAt === null && !motion?.returning)
        focusArtwork(focusedArtwork);
    },
    startWalk: async () => {
      if (overview) goTo("lobby");
      motion = null;
      focusedArtwork = null;
      onTravelProgress?.(1);
      onTravel?.(false);
      suspended = false;
      canvas.focus();
      try {
        await canvas.requestPointerLock();
      } catch {
        onLock(false);
      }
    },
    setSuspended(value, { pauseMotion = false } = {}) {
      if (value) setExhibitHovered(false);
      suspended = value;
      keys.clear();
      drag = false;
      if (value && pointerId !== null && canvas.hasPointerCapture?.(pointerId)) canvas.releasePointerCapture(pointerId);
      if (value) pointerId = null;
      if (pauseMotion && pausedAt === null) pausedAt = performance.now();
      else if (!pauseMotion && pausedAt !== null) {
        if (motion) motion.start += performance.now() - pausedAt;
        pausedAt = null;
      }
      orbit.enabled = overview && !suspended && pausedAt === null;
      if (value && locked) document.exitPointerLock();
    },
    setMove(direction, pressed) {
      const codes = {
        forward: "KeyW",
        back: "KeyS",
        left: "KeyA",
        right: "KeyD",
      };
      if (pressed && !suspended && !motion) keys.add(codes[direction]);
      else keys.delete(codes[direction]);
    },
    update(dt) {
      updateExhibitHover(dt);
      if (pausedAt !== null) return;
      if (overview) {
        orbit.update();
        return;
      }
      if (motion) {
        const elapsed = (performance.now() - motion.start) / 1000;
        const pose = sampleCameraMotion(motion.path, elapsed);
        if (motion.entry) motion.entry.elapsed = Math.min(elapsed, motion.path.duration);
        applyPose(pose);
        onTravelProgress?.(
          Math.max(0, Math.min(1, elapsed / motion.path.duration)),
        );
        if (pose.done) {
          const complete = motion.complete;
          motion = null;
          complete?.();
          onTravel?.(false);
        }
      } else if (!suspended) {
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
          camera.position.y = destinations.lobby.position[1];
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
      pitch,
      quaternion: camera.quaternion.toArray(),
      room,
      overview,
      locked,
      moving: Boolean(motion),
      motionKind: motion?.path.kind || (motion ? "travel" : null),
      motionDuration: motion?.path.duration ?? 0,
      paused: pausedAt !== null,
      selectedArtwork: focusedArtwork?.id ?? null,
      fov: camera.fov,
    }),
    dispose() {
      setExhibitHovered(false);
      listeners.forEach((f) => f());
      orbit.dispose();
      if (locked) document.exitPointerLock();
    },
  };
}
