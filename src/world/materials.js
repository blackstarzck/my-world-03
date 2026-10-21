import * as THREE from "three";

function canvasTexture(canvas, color = true) {
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  if (color) texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}
function noiseCanvas(size, seed = 1) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d");
  const data = ctx.createImageData(size, size);
  let state = seed;
  for (let i = 0; i < data.data.length; i += 4) {
    state = (Math.imul(state, 1664525) + 1013904223) | 0;
    const n = 125 + ((state >>> 0) / 4294967296 - 0.5) * 42;
    data.data[i] = data.data[i + 1] = data.data[i + 2] = n;
    data.data[i + 3] = 255;
  }
  ctx.putImageData(data, 0, 0);
  return c;
}
function herringbone(image) {
  const c = document.createElement("canvas");
  c.width = c.height = 1024;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#725940";
  ctx.fillRect(0, 0, 1024, 1024);
  const draw = (x, y, vertical, index) => {
    ctx.save();
    ctx.translate(x * 128, y * 128);
    if (vertical) {
      ctx.translate(128, 0);
      ctx.rotate(Math.PI / 2);
    }
    ctx.drawImage(
      image,
      (index * 83) % 450,
      (index * 137) % 600,
      510,
      120,
      0,
      0,
      512,
      128,
    );
    ctx.fillStyle = `rgba(${index % 3 === 0 ? "67,35,13" : "199,151,91"},${0.12 + (index % 4) * 0.035})`;
    ctx.fillRect(0, 0, 512, 128);
    ctx.strokeStyle = "rgba(48,35,22,.44)";
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, 510, 126);
    ctx.strokeStyle = "rgba(244,223,177,.18)";
    ctx.strokeRect(3, 3, 506, 122);
    ctx.restore();
  };
  for (let y = -4; y < 12; y++)
    for (let j = -1; j < 2; j++) {
      let x = ((8 - (y % 8)) % 8) + j * 8;
      draw(x, y, false, Math.abs(y * 19 + j * 3) + 1);
    }
  for (let x = -4; x < 12; x++)
    for (let j = -1; j < 2; j++) {
      let y = ((4 - (x % 8) + 8) % 8) + j * 8;
      draw(x, y, true, Math.abs(x * 31 + j * 7) + 5);
    }
  const t = canvasTexture(c);
  t.repeat.set(12 / 1.8, 24 / 1.8);
  t.center.set(0.5, 0.5);
  t.rotation = Math.PI / 4;
  return t;
}
function limestone(image, repeat) {
  const c = document.createElement("canvas");
  c.width = c.height = 1024;
  const ctx = c.getContext("2d");
  for (let row = 0; row < 4; row++)
    for (let col = 0; col < 4; col++) {
      const x = col * 256,
        y = row * 256,
        shade = (row * 7 + col * 13) % 9;
      ctx.drawImage(
        image,
        (col * 167) % 650,
        (row * 179) % 650,
        300,
        300,
        x,
        y,
        256,
        256,
      );
      ctx.fillStyle = `rgba(${210 + shade},${204 + shade},${188 + shade},.86)`;
      ctx.fillRect(x, y, 256, 256);
      ctx.strokeStyle = "rgba(140,139,123,.33)";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x + 0.75, y + 0.75, 254.5, 254.5);
    }
  const tex = canvasTexture(c);
  tex.repeat.set(...repeat);
  return tex;
}
export async function createMaterials(manager) {
  const loader = new THREE.TextureLoader(manager);
  const maps = Object.fromEntries(
    await Promise.all(
      ["wood", "stone", "cast", "smooth"].map(async (name) => {
        const result = await Promise.all(
          ["color", "normal", "roughness"].map((type) =>
            (name === "wood" && type !== "color") || (name === "stone" && type === "normal")
              ? null : loader.loadAsync(`/assets/${name}-${type}.jpg`),
          ),
        );
        result.forEach((t, i) => {
          if (!t) return;
          t.wrapS = t.wrapT = THREE.RepeatWrapping;
          t.anisotropy = 8;
          if (i === 0) t.colorSpace = THREE.SRGBColorSpace;
        });
        return [name, result];
      }),
    ),
  );
  const make = (name, repeat, color, roughness, normal) => {
    const textures = maps[name].map((t) => {
      const a = t.clone();
      a.repeat.set(...repeat);
      a.needsUpdate = true;
      return a;
    });
    return new THREE.MeshStandardMaterial({
      color,
      map: textures[0],
      normalMap: textures[1],
      roughnessMap: textures[2],
      normalScale: new THREE.Vector2(normal, normal),
      roughness,
      envMapIntensity: 0.45,
    });
  };
  const plasterBump = canvasTexture(noiseCanvas(256), false);
  plasterBump.repeat.set(6, 3);
  const m = {
    plaster: new THREE.MeshStandardMaterial({
      color: "#ece7d9",
      roughness: 0.86,
      bumpMap: plasterBump,
      bumpScale: 0.018,
    }),
    ceiling: new THREE.MeshStandardMaterial({
      color: "#e6e2d7",
      roughness: 0.92,
    }),
    teal: new THREE.MeshStandardMaterial({
      color: "#153d45",
      roughness: 0.82,
      bumpMap: plasterBump,
      bumpScale: 0.018,
    }),
    concrete: make("cast", [6, 1.5], "#bdc0ba", 0.92, 0.18),
    concreteFloor: make("smooth", [3, 6], "#a9aaa5", 0.62, 0.12),
    sculptureWall: make("cast", [6, 1.5], "#ddd9cd", 0.88, 0.12),
    stone: new THREE.MeshStandardMaterial({
      map: limestone(maps.stone[0].image, [12 / 4, 24 / 4]),
      roughness: 0.59,
      envMapIntensity: 0.5,
      bumpMap: maps.stone[2],
      bumpScale: 0.006,
    }),
    lobby: new THREE.MeshStandardMaterial({
      map: limestone(maps.stone[0].image, [25 / 4, 25 / 4]),
      roughness: 0.56,
      envMapIntensity: 0.6,
      bumpMap: maps.stone[2],
      bumpScale: 0.004,
    }),
    oak: new THREE.MeshStandardMaterial({
      color: "#bd9360",
      map: maps.wood[0],
      roughness: 0.5,
    }),
    woodFloor: new THREE.MeshStandardMaterial({
      map: herringbone(maps.wood[0].image),
      roughness: 0.58,
      envMapIntensity: 0.32,
    }),
    brass: new THREE.MeshStandardMaterial({
      color: "#ad8d50",
      metalness: 0.83,
      roughness: 0.28,
    }),
    bronze: new THREE.MeshStandardMaterial({
      color: "#a66d37",
      metalness: 0.85,
      roughness: 0.27,
    }),
    dark: new THREE.MeshStandardMaterial({
      color: "#202b2c",
      metalness: 0.5,
      roughness: 0.35,
    }),
    marble: new THREE.MeshStandardMaterial({
      color: "#ddd6c7",
      roughness: 0.49,
      bumpMap: plasterBump,
      bumpScale: 0.022,
    }),
    glass: new THREE.MeshPhysicalMaterial({
      color: "#e7f0ec",
      metalness: 0,
      roughness: 0.07,
      transparent: true,
      opacity: 0.1,
      depthWrite: false,
      side: THREE.DoubleSide,
      envMapIntensity: 1.4,
    }),
    skylight: new THREE.MeshPhysicalMaterial({
      color: "#c9e0e4",
      roughness: 0.12,
      transparent: true,
      opacity: 0.2,
      depthWrite: false,
      side: THREE.DoubleSide,
      emissive: "#d6e4e5",
      emissiveIntensity: 0.18,
    }),
    light: new THREE.MeshBasicMaterial({ color: "#fff1c9" }),
  };
  m.concreteFloor.map = null;
  const veneer = maps.wood[0].clone();
  veneer.repeat.set(0.5, 0.14);
  veneer.offset.set(0.1, 0.15);
  veneer.needsUpdate = true;
  m.oak.map = veneer;
  m.oak.color.set("#bdb4a4");
  return m;
}
export function labelTexture(
  lines,
  { color = "#44433d", background = null, size = 512 } = {},
) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size / 2;
  const ctx = canvas.getContext("2d");
  if (background) {
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  lines.forEach((line, i) => {
    ctx.font = `${i === 0 ? "500" : "400"} ${i === 0 ? 58 : 27}px "Malgun Gothic",sans-serif`;
    ctx.fillText(line, size / 2, 95 + i * 56);
  });
  return canvasTexture(canvas);
}
export function contactTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const ctx = c.getContext("2d");
  const g = ctx.createRadialGradient(64, 64, 8, 64, 64, 63);
  g.addColorStop(0, "rgba(25,22,17,.30)");
  g.addColorStop(0.55, "rgba(25,22,17,.13)");
  g.addColorStop(1, "rgba(25,22,17,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  return canvasTexture(c);
}
