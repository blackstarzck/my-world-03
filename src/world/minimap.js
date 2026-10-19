import * as THREE from "three";
import {
  design,
  destinations,
  lobbyArcs,
  lobbyOutline,
  lobbyRadius,
  radians,
  roomIds,
  roomPoint,
  atriumDetails,
} from "./layout.js";
import { archBand, extrude } from "./atrium.js";

// Use the exhibition's world coordinates; only wall heights are cut away.
export function buildMiniature() {
  const model = new THREE.Group();
  const floors = {};
  const material = (color, options = {}) =>
    new THREE.MeshStandardMaterial({ color, roughness: 0.78, ...options });
  const plaster = material("#f4eee2");
  const wood = material("#b18b5f");
  const brass = material("#ae8750", { metalness: 0.45, roughness: 0.32 });
  const stone = material("#e4ded0");
  const glass = material("#acc8c7", {
    transparent: true,
    opacity: 0.3,
    depthWrite: false,
  });
  const mesh = (parent, geometry, mat, position) => {
    const object = new THREE.Mesh(geometry, mat);
    object.position.set(...position);
    object.castShadow = true;
    object.receiveShadow = true;
    parent.add(object);
    return object;
  };
  const box = (parent, mat, size, position) =>
    mesh(parent, new THREE.BoxGeometry(...size), mat, position);
  const slab = (parent, shape, mat, bottom, height) => {
    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth: height,
      bevelEnabled: false,
      curveSegments: 32,
    });
    geometry.rotateX(-Math.PI / 2);
    return mesh(parent, geometry, mat, [0, bottom, 0]);
  };
  const arc = (center, radius, start, end, thickness) => {
    const shape = new THREE.Shape();
    shape.absarc(...center, radius, radians(start), radians(end), false);
    shape.absarc(
      ...center,
      radius - thickness,
      radians(end),
      radians(start),
      true,
    );
    shape.closePath();
    return shape;
  };
  floors.lobby = slab(
    model,
    new THREE.Shape(lobbyOutline().map((p) => new THREE.Vector2(...p))),
    material("#e5dfcf"),
    -0.8,
    0.8,
  );
  for (const [index, a] of lobbyArcs.entries()) {
    const gap =
      (Math.asin(design.lobby.entry.width / 2 / lobbyRadius) * 180) / Math.PI;
    const spans =
      index === 1
        ? [
            [a.start, 90 - gap],
            [90 + gap, a.end],
          ]
        : [[a.start, a.end]];
    for (const [start, end] of spans)
      slab(
        model,
        arc(a.center, lobbyRadius, start, end, 0.45),
        plaster,
        0,
        2.7,
      );
  }
  for (const b of design.lobby.benches)
    slab(
      model,
      arc(
        [0, 0],
        b.radius + b.depth / 2,
        b.angle - b.sweep / 2,
        b.angle + b.sweep / 2,
        b.depth,
      ),
      wood,
      0,
      b.height,
    );
  for (const c of design.lobby.columns)
    mesh(
      model,
      new THREE.CylinderGeometry(0.22, atriumDetails.columnBaseRadius, 2.7, 12),
      plaster,
      [c.x, 1.35, -c.y],
    );
  mesh(
    model,
    new THREE.CylinderGeometry(1.8, 1.8, 0.45, 32),
    stone,
    [0, 0.225, 0],
  );
  const ring = mesh(
    model,
    new THREE.TorusGeometry(1.12, 0.12, 8, 32),
    brass,
    [0, 1.65, 0],
  );
  ring.rotation.y = Math.PI / 2;

  for (const id of roomIds) {
    const group = new THREE.Group();
    group.position.fromArray(roomPoint(id, 0, 0));
    group.rotation.y = radians(design.rooms[id].angle - 90);
    group.userData.room = id;
    model.add(group);
    const { width, length, portal_width: portal } = design.gallery;
    mesh(
      group,
      extrude(
        archBand(atriumDetails.portalRadius, atriumDetails.portalSpring, 0.28),
        0.35,
      ),
      plaster,
      [0, 0, 0.25],
    );
    const wall = material(design.rooms[id].wall);
    floors[id] = box(
      group,
      material(id === "01" ? "#c6a277" : design.rooms[id].color),
      [width + 0.6, 0.8, length + 0.6],
      [0, -0.4, -length / 2],
    );
    // Low front walls expose the interior like an architectural dollhouse.
    for (const side of [-1, 1]) {
      const wallHeight = id === "03" && side === 1 ? 0.9 : 2.7;
      box(
        group,
        wall,
        [0.4, wallHeight, length + 0.4],
        [side * (width / 2 + 0.15), wallHeight / 2, -length / 2],
      );
      box(
        group,
        plaster,
        [0.48, 0.12, length + 0.5],
        [side * (width / 2 + 0.15), wallHeight, -length / 2],
      );
      const jamb = (width - portal) / 2;
      box(
        group,
        plaster,
        [jamb, 2.7, atriumDetails.portalDepth],
        [side * (portal / 2 + jamb / 2), 1.35, atriumDetails.portalDepth / 2],
      );
    }
    box(group, wall, [width + 0.6, 2.7, 0.4], [0, 1.35, -length - 0.15]);
    box(group, plaster, [width + 0.7, 0.12, 0.48], [0, 2.7, -length - 0.15]);
    if (id === "01") {
      const seam = material("#a7835e");
      for (let t = -5; t <= 5; t += 1)
        box(group, seam, [0.025, 0.01, length], [t, 0.01, -length / 2]);
      for (let v = 3; v < length; v += 3)
        box(group, seam, [width, 0.01, 0.025], [0, 0.01, -v]);
    }
    for (const p of design.panels.filter((p) => p.room === id)) {
      const panel = new THREE.Group();
      panel.position.set(p.t, 0, -p.v);
      panel.rotation.y = radians(p.rotation_y);
      group.add(panel);
      box(panel, wall, [p.w, p.h, p.l], [0, p.h / 2, 0]);
      box(panel, plaster, [p.w + 0.08, 0.1, p.l + 0.08], [0, p.h, 0]);
    }
    for (const b of design.benches.filter((b) => b.room === id))
      box(group, wood, [b.w, b.h, b.l], [b.t, b.h / 2, -b.v]);
    for (const c of design.cases.filter((c) => c.room === id)) {
      box(group, stone, [c.w, 0.25, c.l], [c.t, 0.125, -c.v]);
      box(group, stone, [0.65, 1, 0.65], [c.t, 0.5, -c.v]);
      mesh(group, new THREE.IcosahedronGeometry(0.42, 0), brass, [
        c.t,
        1.4,
        -c.v,
      ]);
      box(group, glass, [c.w, c.h, c.l], [c.t, c.h / 2, -c.v]).castShadow =
        false;
    }
    for (const a of design.artworks.filter((a) => a.room === id)) {
      const end = a.face === "end";
      box(group, brass, end ? [a.w, a.h, 0.16] : [0.16, a.h, a.w], [
        end ? 0 : Math.sign(a.t) * 5.88,
        a.center_z,
        end ? -23.88 : -a.v,
      ]);
      box(
        group,
        stone,
        end ? [a.w - 0.18, a.h - 0.18, 0.18] : [0.18, a.h - 0.18, a.w - 0.18],
        [end ? 0 : Math.sign(a.t) * 5.86, a.center_z, end ? -23.86 : -a.v],
      );
    }
  }
  for (const [id, floor] of Object.entries(floors)) floor.userData.room = id;

  const pin = new THREE.Group();
  pin.name = "Current location";
  const pinMaterial = material("#dc633b", {
    roughness: 0.25,
    metalness: 0.2,
    depthTest: false,
  });
  // A rounded head and tapered point are actual lit 3D geometry.
  const tip = mesh(
    pin,
    new THREE.ConeGeometry(1.1, 2.3, 32),
    pinMaterial,
    [0, 1.35, 0],
  );
  tip.rotation.z = Math.PI;
  mesh(pin, new THREE.SphereGeometry(1.3, 32, 20), pinMaterial, [0, 3, 0]);
  const shine = mesh(
    pin,
    new THREE.SphereGeometry(0.46, 20, 12),
    material("#fff6e8", { depthTest: false }),
    [0.5, 3.55, 0.94],
  );
  shine.scale.set(1, 1, 0.45);
  pin.traverse((o) => {
    if (o.isMesh) {
      o.renderOrder = 10;
      o.castShadow = false;
    }
  });
  const halo = mesh(
    pin,
    new THREE.RingGeometry(1.55, 1.85, 40),
    new THREE.MeshBasicMaterial({
      color: "#cd643c",
      transparent: true,
      opacity: 0.6,
      depthTest: false,
    }),
    [0, 0.08, 0],
  );
  halo.rotation.x = -Math.PI / 2;
  halo.renderOrder = 9;
  const direction = new THREE.Group();
  const arrow = new THREE.Shape();
  arrow.moveTo(0, 3.8);
  arrow.lineTo(-0.8, 2.5);
  arrow.lineTo(0.8, 2.5);
  arrow.closePath();
  const arrowMesh = mesh(
    direction,
    new THREE.ShapeGeometry(arrow),
    new THREE.MeshBasicMaterial({
      color: "#a54b2a",
      side: THREE.DoubleSide,
      depthTest: false,
    }),
    [0, 0.1, 0],
  );
  arrowMesh.rotation.x = -Math.PI / 2;
  arrowMesh.renderOrder = 9;
  pin.add(direction);
  model.add(pin);
  return { model, floors, pin, direction };
}

export function createMinimap(container, labels, onNavigate) {
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.shadowMap.autoUpdate = false;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  renderer.domElement.setAttribute("aria-hidden", "true");
  container.prepend(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-42, 42, 34, -34, 0.1, 250);
  camera.zoom = 1.5;
  camera.position.set(48, 65, 80);
  camera.lookAt(0, 0, -3);
  // Center the asymmetric plan and use the panel's side gutters for the zoom.
  camera.translateX(-7.8);
  camera.translateY(-0.6);
  const { model, floors, pin, direction } = buildMiniature();
  scene.add(model, new THREE.HemisphereLight("#fffaf0", "#9a8971", 1.8));
  const sun = new THREE.DirectionalLight("#fff1d9", 2.2);
  sun.position.set(-25, 55, 30);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, {
    left: -48,
    right: 48,
    top: 48,
    bottom: -48,
    near: 1,
    far: 140,
  });
  sun.shadow.normalBias = 0.12;
  sun.shadow.bias = -0.0002;
  scene.add(sun);
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(160, 160),
    new THREE.ShadowMaterial({ opacity: 0.16 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.85;
  ground.receiveShadow = true;
  scene.add(ground);
  const ray = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let disposed = false;
  const render = () => {
    if (!disposed) renderer.render(scene, camera);
  };
  const anchors = {
    lobby: [0, 0, -5],
    ...Object.fromEntries(roomIds.map((id) => [id, roomPoint(id, 0, 18)])),
  };
  const resize = () => {
    const { width, height } = container.getBoundingClientRect();
    if (!width || !height) return;
    const aspect = width / height;
    const panelStyle = getComputedStyle(container.parentElement);
    const contentWidth =
      container.parentElement.clientWidth -
      parseFloat(panelStyle.paddingLeft) -
      parseFloat(panelStyle.paddingRight);
    const halfHeight = Math.max(31, 41 / (contentWidth / height));
    camera.left = -halfHeight * aspect;
    camera.right = halfHeight * aspect;
    camera.top = halfHeight;
    camera.bottom = -halfHeight;
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
    renderer.setSize(width, height);
    pin.scale.setScalar(width < 200 ? 1.65 : 1.3);
    for (const label of labels) {
      const point = new THREE.Vector3(...anchors[label.dataset.room]).project(
        camera,
      );
      label.style.left = `${(point.x + 1) * 50}%`;
      label.style.top = `${(1 - point.y) * 50}%`;
    }
    render();
  };
  const hitRoom = (event) => {
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.set(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      (-(event.clientY - rect.top) / rect.height) * 2 + 1,
    );
    ray.setFromCamera(pointer, camera);
    return ray.intersectObjects(Object.values(floors), false)[0]?.object
      .userData.room;
  };
  const click = (event) => {
    const id = hitRoom(event);
    if (id) onNavigate(id);
  };
  const hover = (event) => {
    renderer.domElement.style.cursor = hitRoom(event) ? "pointer" : "default";
  };
  renderer.domElement.addEventListener("click", click);
  renderer.domElement.addEventListener("pointermove", hover);
  const observer = new ResizeObserver(resize);
  observer.observe(container);
  renderer.shadowMap.needsUpdate = true;
  let lastPosition = "";
  const updatePosition = ({ position, yaw, overview }) => {
    const key = `${position[0]},${position[2]},${yaw},${overview}`;
    if (key === lastPosition) return;
    lastPosition = key;
    pin.visible = !overview;
    pin.position.set(position[0], 0.12, position[2]);
    direction.rotation.y = yaw;
    render();
  };
  updatePosition({
    position: destinations.lobby.position,
    yaw: 0,
    overview: false,
  });
  resize();
  return {
    updatePosition,
    setActive(id) {
      for (const [room, floor] of Object.entries(floors)) {
        floor.material.emissive.set(room === id ? "#8d784b" : "#000000");
        floor.material.emissiveIntensity = room === id ? 0.12 : 0;
      }
      render();
    },
    dispose() {
      disposed = true;
      observer.disconnect();
      renderer.domElement.removeEventListener("click", click);
      renderer.domElement.removeEventListener("pointermove", hover);
      const geometries = new Set(),
        materials = new Set();
      scene.traverse((object) => {
        if (object.geometry) geometries.add(object.geometry);
        if (object.material) materials.add(object.material);
      });
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      sun.shadow.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
