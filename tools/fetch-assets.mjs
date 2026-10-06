import fs from 'node:fs/promises';
const base = new URL('../public/assets/', import.meta.url);
await fs.mkdir(base, { recursive: true });
async function get(url, filename) {
  const response = await fetch(url, { headers: { 'User-Agent': 'Triad-Exhibition/1.0' }, signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (filename) await fs.writeFile(new URL(filename, base), bytes);
  return filename ? { filename, bytes: bytes.length, source: url } : JSON.parse(bytes.toString());
}
const tasks=[];
for (const [name,asset] of [['wood','wooden_floor_01'],['concrete','concrete_floor_01'],['stone','stone_tiles_02']]) {
  for (const [suffix,kind] of [['diff','color'],['nor_gl','normal'],['rough','roughness']]) tasks.push(get(`https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/${asset}/${asset}_${suffix}_1k.jpg`,`${name}-${kind}.jpg`));
}
tasks.push(get('https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/models/gltf/LeePerrySmith/LeePerrySmith.glb','portrait.glb'));
tasks.push(get('https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/models/gltf/LeePerrySmith/LeePerrySmith_License.txt','portrait-license.txt'));
const downloads=await Promise.allSettled(tasks);
for (const r of downloads) console.log(r.status==='fulfilled'?r.value:r.reason.message);
const chosen=[];
for (const query of ['monet','rembrandt','landscape','kandinsky']) {
  try {
    const data=await get(`https://api.artic.edu/api/v1/artworks/search?q=${query}&limit=10&fields=id,title,image_id,is_public_domain,artist_display,date_display`);
    for (const work of data.data.filter(w=>w.is_public_domain&&w.image_id).slice(0,3)) {
      if(chosen.some(w=>w.id===work.id))continue;
      const filename=`art-${work.id}.jpg`;
      await get(`https://www.artic.edu/iiif/2/${work.image_id}/full/843,/0/default.jpg`,filename);
      chosen.push({...work,src:`/assets/${filename}`,url:`https://www.artic.edu/artworks/${work.id}`});
    }
  } catch(error) { console.log('art download',query,error.message); }
}
await fs.writeFile(new URL('artworks.json',base),JSON.stringify(chosen,null,2));
console.log('Artworks saved:',chosen.length);
await fs.writeFile(new URL('sources.json',base),JSON.stringify(downloads.filter(r=>r.status==='fulfilled').map(r=>r.value),null,2));
