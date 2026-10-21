import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { GTAOPass } from "three/addons/postprocessing/GTAOPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { createBlackHoleBloom, updateBlackHoleCamera } from "../src/world/black-hole-bloom.js";
import { restoreBlackHoleMaterials, blackHoleOrientation, blackHoleReference } from "../src/world/black-hole-materials.js";
import { BlackHoleRefractionPass } from "../src/world/black-hole-optics.js";
import { optimizeBlackHoleGeometry } from "../src/world/black-hole-geometry.js";
import { GalleryAOPass } from "../src/world/gallery-ao.js";
import { GalleryRenderPass } from "../src/world/gallery-render.js";
import { BlackHoleAntialias } from "../src/world/black-hole-antialias.js";
import { parseBlackHoleEnvironment } from "../src/world/black-hole-environment.js";
import { BlackHoleDepth } from "../src/world/black-hole-depth.js";
import { BlackHoleFocus } from "../src/world/black-hole-focus.js";

async function fixture() {
  const texture = new THREE.Texture(); texture.offset.set(.15,.3);
  const exhibit = new THREE.Group();
  for (const name of ["black_hole_light2", "black_hole_center", "black_hole_blackoutside", "black_hole_distortion", "ring2"])
    exhibit.add(new THREE.Mesh(new THREE.SphereGeometry(.2,12,8), new THREE.MeshStandardMaterial({name})));
  await restoreBlackHoleMaterials(exhibit, {async getDependency() {return texture;}});
  return {texture, exhibit, materials:exhibit.children.map(mesh=>mesh.material)};
}

test("source alpha, opacity and refraction stay independent; original texture colors survive", async () => {
  const {texture,exhibit,materials:[light,core,shell,distortion,ring]} = await fixture();
  assert.equal(light.map.source,texture.source);
  assert.equal(light.emissiveMap.source,texture.source);
  assert.deepEqual(texture.offset.toArray(),[.15,.3],"restoring channels cannot mutate a shared GLB texture transform");
  assert.equal(light.emissiveIntensity,.6);
  assert.equal(light.alphaTest,blackHoleReference.materials.black_hole_light2.AlphaMask.factor);
  assert.equal(light.transparent,false,"opaque masked emitters participate in refraction depth");
  assert.equal(light.depthWrite,true);
  assert.equal(core.userData.blackHoleOptics.sourceIor.value,1.2090246114570982);
  assert.equal(distortion.userData.blackHoleOptics.sourceOpacity.value,0,"zero surface opacity means full refraction");
  assert.equal(shell.blending,THREE.NoBlending,"optical layers composite internally rather than painting a tinted face");
  assert.notEqual(shell.sourceOpacityMap,shell.alphaMap);
  assert.deepEqual(shell.sourceOpacityMap.repeat.toArray(),[2.0000000000000027,20.000000000000004]);
  assert.deepEqual(shell.alphaMap.repeat.toArray(),[2.0000000000000027,6.9999999999999964]);
  assert.equal(ring.opacity,.2); assert.equal(ring.blending,THREE.NormalBlending);
  exhibit.traverse(o=>{o.geometry?.dispose();o.material?.dispose()});texture.dispose();
});

test("refraction restores all visibility and renderer target after a failed capture", async () => {
  const {exhibit} = await fixture(); const scene=new THREE.Scene();scene.add(exhibit);
  exhibit.userData.refractionRadius=2;exhibit.scale.setScalar(1.5);exhibit.updateMatrixWorld(true);
  const camera=new THREE.PerspectiveCamera(6,1,.005,200);
  const pass=new BlackHoleRefractionPass(scene,exhibit,camera);
  const target={name:"gallery target"};let current=target;
  const renderer={getRenderTarget:()=>current,setRenderTarget:t=>{current=t},clear(){},render(s){
    assert.equal(s,scene); assert.ok(pass.surfaces.every(o=>!o.visible));throw new Error("capture failed");
  }};
  try {
    assert.throws(()=>pass.render(renderer),/capture failed/);
    assert.equal(current,target);assert.ok(pass.surfaces.every(o=>o.visible));
    assert.equal(pass.surfaces[0].material.userData.blackHoleOptics.modelRadius.value,3);
  } finally {pass.dispose();}
});

test("telephoto optics preserve screen position at different gaze angles and approach magnifications", () => {
  const center=new THREE.Vector3(0,1.75,0), optical=new THREE.PerspectiveCamera();
  for (const target of [new THREE.Vector3(0,1.75,0),new THREE.Vector3(-2,3,-1)]) {
    const viewer=new THREE.PerspectiveCamera(59,16/9,.075,250);viewer.position.set(3,1.75,8);
    viewer.lookAt(target);viewer.updateMatrixWorld(true);
    for (const zoom of [1,1.8]) {
      updateBlackHoleCamera(optical,viewer,center,zoom);
      const expected=center.clone().project(viewer),actual=center.clone().project(optical);
      assert.ok(Math.abs(actual.x-expected.x)<1e-12 && Math.abs(actual.y-expected.y)<1e-12,
        "look direction must not pull the black hole away from the visitor's horizontal sightline");
      assert.ok(optical.position.distanceTo(center)>viewer.position.distanceTo(center)*5,
        "the near foreground disk stays beyond the optical camera's near plane");
    }
  }
});

test("optical depth precision follows the model bounds independently of the gallery range", () => {
  const center=new THREE.Vector3(0,1.75,0), optical=new THREE.PerspectiveCamera();
  const viewer=new THREE.PerspectiveCamera(59,16/9,.075,250);
  viewer.position.set(3,1.75,8);viewer.lookAt(center);viewer.updateMatrixWorld(true);
  for(const radius of [2.3,4.3]) {
    updateBlackHoleCamera(optical,viewer,center,1.8,radius);
    const z=-center.clone().applyMatrix4(optical.matrixWorldInverse).z;
    assert.ok(optical.near<z-radius && optical.far>z+radius);
    assert.ok(Math.abs((optical.far-optical.near)-2.2*radius)<1e-10);
    const range=[optical.near,optical.far];viewer.far=15000;viewer.updateProjectionMatrix();
    updateBlackHoleCamera(optical,viewer,center,1.8,radius);
    assert.deepEqual([optical.near,optical.far],range);
  }
});

test("nearest coverage retains zero-opacity distortion and independent alpha transforms", async () => {
  const {exhibit}=await fixture(), camera=new THREE.PerspectiveCamera();
  const pass=new BlackHoleDepth(exhibit.children.map(source=>({source})),camera);
  try {
    const distortion=pass.meshes.find(({source})=>source.material.name==='black_hole_distortion').mesh;
    assert.equal(distortion.material.uniforms.opacity.value,0);
    assert.equal(distortion.material.depthWrite,true);
    assert.equal(distortion.material.blending,THREE.NoBlending);
    const shell=pass.meshes.find(({source})=>source.material.name==='black_hole_blackoutside');
    assert.equal(shell.mesh.material.uniforms.maskTransform.value,shell.source.material.alphaMap.matrix);
    assert.equal(shell.mesh.material.uniforms.opacityTransform.value,shell.source.material.sourceOpacityMap.matrix);
    assert.notEqual(shell.mesh.material.uniforms.maskTransform.value,shell.mesh.material.uniforms.opacityTransform.value);
    exhibit.position.set(2,3,4);exhibit.updateMatrixWorld(true);
    let target;
    const renderer={setRenderTarget(t){target=t},clear(){},render(scene,c){
      assert.equal(target,pass.target);assert.equal(c,camera);assert.equal(scene,pass.scene);
      for(const {source,mesh} of pass.meshes) assert.deepEqual(mesh.matrix.elements,source.matrixWorld.elements);
    }};
    pass.setSize(800,600);pass.render(renderer);assert.equal(pass.target.width,800);
  } finally {pass.dispose();exhibit.traverse(o=>{o.geometry?.dispose();o.material?.dispose()});}
});

test("focus filtering reads independent color and nearest depth while writing the final model", () => {
  const pass=new BlackHoleFocus(blackHoleReference.postProcess.dof);
  const model=new THREE.WebGLRenderTarget(64,64), history=new THREE.Texture(), depth=new THREE.DepthTexture(64,64);
  model.depthTexture=new THREE.DepthTexture(64,64);
  let current;const writes=[];
  const renderer={setRenderTarget(t){current=t},render(){writes.push(current)}};
  try {
    pass.setSize(800,600);
    pass.render(renderer,model,history,new THREE.PerspectiveCamera(6,1,.1,10),4,depth);
    assert.deepEqual(writes,[pass.target,model]);
    assert.equal(pass.uniforms.sceneDepth.value,depth);assert.equal(pass.uniforms.source.value,history);
    assert.throws(()=>pass.render(renderer,model,model.texture,new THREE.PerspectiveCamera(),1,depth),/independent/);
    assert.throws(()=>pass.render(renderer,model,history,new THREE.PerspectiveCamera(),1,model.depthTexture),/independent/);
  } finally {pass.dispose();model.dispose();history.dispose();depth.dispose();}
});

test("isolated light bypasses gallery tone mapping and restores a distant fallback", async () => {
  const {exhibit}=await fixture();const viewer=new THREE.PerspectiveCamera(59,1,.075,250);
  viewer.position.set(0,0,8);viewer.lookAt(0,0,0);viewer.updateMatrixWorld(true);
  const effect=createBlackHoleBloom(exhibit,viewer),output=new OutputPass();effect.attachOutput(output);
  try {
    effect.resize(800,600,1,"balanced");effect.update(1,false);
    assert.equal(effect.pass.enabled,true);assert.equal(effect.immersion,1);
    assert.ok(effect.pass.sources.every(({source})=>!source.visible));
    assert.equal(effect.pass.scene.children.filter(o=>o.isMesh).length,0,
      "the optical scene owns only its proxy root and light probe, never gallery walls");
    const shader=output.material.fragmentShader;
    assert.ok(shader.indexOf("ACESFilmicToneMapping")<shader.indexOf("light.rgb * visible"));
    assert.ok(shader.indexOf("light.rgb * visible")<shader.indexOf("sRGBTransferOETF"),
      "source radiance is merged after ACES, before sRGB conversion");
    viewer.position.z=35;effect.update(0,false);assert.equal(effect.pass.enabled,false);
    assert.equal(effect.immersion,0);assert.ok(exhibit.children.some(o=>o.material?.name==="black-hole-distant"&&o.visible));
    viewer.position.z=8;viewer.lookAt(0,0,16);effect.update(0,false);assert.equal(effect.pass.enabled,false);
    viewer.lookAt(0,0,0);effect.update(0,true);assert.equal(effect.pass.enabled,false);
  } finally {effect.pass.dispose();output.dispose();}
});

test("geometry reduction retains texture coordinates and stays within its silhouette error budget", async () => {
  const geometry=new THREE.PlaneGeometry(100,100,120,120),root=new THREE.Group();
  const uv=geometry.getAttribute("uv").array.slice(),count=geometry.index.count;
  root.add(new THREE.Mesh(geometry,new THREE.MeshBasicMaterial()));
  await optimizeBlackHoleGeometry(root);
  assert.ok(geometry.index.count<count);assert.deepEqual(geometry.getAttribute("uv").array,uv);
  assert.ok(geometry.userData.simplificationError<=.00005);
  geometry.dispose();root.children[0].material.dispose();
});

test("the GLB's baked orientation is applied once on a horizontal lobby sightline", () => {
  const a=THREE.MathUtils.degToRad(blackHoleReference.presentation.azimuth),e=THREE.MathUtils.degToRad(blackHoleReference.presentation.elevation);
  const source=new THREE.Vector3(Math.sin(a)*Math.cos(e),Math.sin(e),Math.cos(a)*Math.cos(e));
  const lobby=new THREE.Vector3(3,0,8).normalize();
  source.applyQuaternion(blackHoleOrientation(lobby));
  assert.ok(source.distanceTo(lobby)<1e-12);
});

test("temporal detail restores the lens and discards history after camera movement", () => {
  const aa = new BlackHoleAntialias(), camera = new THREE.PerspectiveCamera(6, 1.8, .005, 200);
  const model = new THREE.WebGLRenderTarget(64, 64), original = camera.projectionMatrix.clone();
  const renderer = { setRenderTarget() {}, render() {} };
  try {
    aa.setSize(64, 64); aa.begin(camera);
    assert.equal(aa.valid, false); assert.notDeepEqual(camera.projectionMatrix.elements, original.elements);
    aa.resolve(renderer, model, camera);
    assert.deepEqual(camera.projectionMatrix.elements, original.elements);
    aa.begin(camera); assert.equal(aa.valid, true); aa.resolve(renderer, model, camera);
    camera.position.x += .1; aa.begin(camera); assert.equal(aa.valid, false);
    aa.resolve(renderer, model, camera); assert.equal(aa.material.uniforms.weight.value, 0);
  } finally { aa.dispose(); model.dispose(); }
});

test("the public environment loader preserves cubemap face, channel and mip order", () => {
  const data = new Uint8Array(6 * (4 + 1) * 4); let offset = 0;
  for (const size of [2, 1]) for (let face = 0; face < 6; face++) {
    const count = size * size;
    for (let channel = 0; channel < 4; channel++)
      data.fill(face * 10 + channel + 1, offset + channel * count, offset + (channel + 1) * count);
    offset += count * 4;
  }
  const cube = parseBlackHoleEnvironment(data, 2);
  try {
    assert.equal(cube.image.length, 6); assert.equal(cube.mipmaps.length, 1);
    assert.deepEqual(Array.from(cube.image[3].image.data.slice(0, 4)), [31, 32, 33, 34]);
    assert.deepEqual(Array.from(cube.mipmaps[0].image[5].image.data), [51, 52, 53, 54]);
    assert.throws(() => parseBlackHoleEnvironment(data.slice(0, -1), 2), /Incomplete/);
  } finally { cube.dispose(); }
});

test("AO excludes luminous geometry and restores visibility even when rendering fails", () => {
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera();
  const visible = new THREE.Group(), hidden = new THREE.Group(); hidden.visible = false;
  scene.add(visible, hidden);
  const pass = new GalleryAOPass(scene, camera, 64, 64, [visible, hidden]);
  const original = GTAOPass.prototype.render;
  try {
    GTAOPass.prototype.render = () => {
      assert.equal(visible.visible, false); assert.equal(hidden.visible, false);
      throw new Error("GPU failure");
    };
    assert.throws(() => pass.render({}), /GPU failure/);
    assert.equal(visible.visible, true); assert.equal(hidden.visible, false);
    GTAOPass.prototype.render = () => { assert.equal(visible.visible, false); };
    pass.render({}); assert.equal(visible.visible, true);
  } finally { GTAOPass.prototype.render = original; pass.dispose(); }
});

test("scene antialiasing resolves once and retains independent depth after color copies", () => {
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera();
  const pass = new GalleryRenderPass(scene, camera), output = new THREE.WebGLRenderTarget(64, 64);
  let target, sceneDraws = 0, copies = 0;
  const renderer = {
    autoClear: true, setRenderTarget(value) { target = value; }, clear() {},
    render(object) {
      if (object === scene) { sceneDraws++; assert.equal(target, pass.target); }
      else { copies++; assert.equal(target, output); }
    },
  };
  try {
    const depth = pass.target.depthTexture;
    pass.setSize(800, 600); pass.render(renderer, null, output);
    assert.equal(sceneDraws, 1); assert.equal(copies, 1); assert.equal(renderer.autoClear, true);
    assert.equal(pass.target.depthTexture, depth); assert.equal(pass.copy.uniforms.tDiffuse.value, pass.target.texture);
    assert.equal(output.samples, 0); pass.setSamples(0);
    assert.equal(pass.target.samples, 0); assert.equal(pass.target.depthTexture, depth);
  } finally { pass.dispose(); output.dispose(); }
});
