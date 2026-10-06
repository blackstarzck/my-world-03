import fs from 'node:fs/promises';
const base=new URL('../public/assets/',import.meta.url);
const objects=[436535,436532,437133,437127,437261,436121,437980,436037,437053,436534,436947,437329];
const result=await Promise.allSettled(objects.map(async id=>{
 const response=await fetch(`https://collectionapi.metmuseum.org/public/collection/v1/objects/${id}`,{signal:AbortSignal.timeout(20000)});
 if(!response.ok)throw new Error(`metadata ${id}: ${response.status}`);
 const w=await response.json();if(!w.isPublicDomain||!w.primaryImageSmall)throw new Error(`Unavailable ${id}`);
 const image=await fetch(w.primaryImageSmall,{signal:AbortSignal.timeout(30000)});if(!image.ok)throw new Error(`image ${id}: ${image.status}`);
 await fs.writeFile(new URL(`art-${id}.jpg`,base),Buffer.from(await image.arrayBuffer()));
 return {id,title:w.title,artist_display:w.artistDisplayName,date_display:w.objectDate,src:`/assets/art-${id}.jpg`,url:w.objectURL,is_public_domain:true};
}));
const works=result.filter(r=>r.status==='fulfilled').map(r=>r.value);
for(const r of result)console.log(r.status==='fulfilled'?`${r.value.id} ${r.value.title}`:r.reason.message);
if(works.length)await fs.writeFile(new URL('artworks.json',base),JSON.stringify(works,null,2));
