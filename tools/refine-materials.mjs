import fs from 'node:fs/promises';
const base=new URL('../public/assets/',import.meta.url);
const sources=JSON.parse(await fs.readFile(new URL('sources.json',base),'utf8'));
await Promise.all([['cast','concrete_wall_009'],['smooth','smooth_concrete_floor']].flatMap(([name,asset])=>[['diff','color'],['nor_gl','normal'],['rough','roughness']].map(async([suffix,kind])=>{
  const url=`https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/${asset}/${asset}_${suffix}_1k.jpg`;
  try {const r=await fetch(url);if(!r.ok)throw new Error(String(r.status));const bytes=Buffer.from(await r.arrayBuffer());const filename=`${name}-${kind}.jpg`;await fs.writeFile(new URL(filename,base),bytes);sources.push({filename,bytes:bytes.length,source:url});console.log(filename,bytes.length);}catch(e){console.log(name,kind,e.message);}
})));
await fs.writeFile(new URL('sources.json',base),JSON.stringify(sources,null,2));
