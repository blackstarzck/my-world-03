const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'C:/Users/buche/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const out=path.resolve('output/browser-checks/detail-navigation');
fs.mkdirSync(out,{recursive:true});

async function main(){
  const THREE=await import('three');
  const browser=await chromium.launch({headless:true,
    executablePath:process.env.CHROMIUM_PATH || 'C:/Users/buche/AppData/Local/ms-playwright/chromium-1223/chrome-win64/chrome.exe',
    args:process.env.CPU_WEBGL ? ['--use-angle=swiftshader','--enable-unsafe-swiftshader'] : []});
  const page=await browser.newPage({viewport:{width:1366,height:768},reducedMotion:'no-preference'});
  const checks=[],errors=[];let failure;
  page.on('pageerror',e=>errors.push(e.message));
  const pass=name=>{checks.push(name);console.log('PASS '+name);};
  const state=()=>page.evaluate(()=>window.__TRIAD__.state());
  const idle=()=>page.waitForFunction(()=>!window.__TRIAD__.state().moving,null,{timeout:60000});
  const detail=()=>page.locator('.project-detail-page');
  async function open(id='A01-01'){
    await page.evaluate(id=>window.__TRIAD__.focusArtwork(id,{animated:false}),id);
    await page.locator('.world canvas').click();
    await detail().waitFor({timeout:60000});
    await page.waitForFunction(()=>Number(getComputedStyle(document.querySelector('.project-detail-page')).opacity)>.999);
  }
  function sameCamera(current,original){
    assert(Math.hypot(...current.position.map((v,i)=>v-original.position[i]))<1e-8);
    assert(new THREE.Quaternion(...current.quaternion).angleTo(new THREE.Quaternion(...original.quaternion))<1e-7);
    assert(Math.abs(current.fov-original.fov)<1e-8);
    assert.equal(current.moving,false);
  }
  async function currentIs(id){
    await page.waitForFunction(id=>document.querySelector('.project-detail-page')?.dataset.artworkId===id,id);
  }
  async function remains(original,id,{sameNode=true}={}){
    await currentIs(id);sameCamera(await state(),original);
    if(sameNode)assert(await detail().evaluate(el=>el===window.__detailNode),'detail stays mounted');
    assert.equal(await page.locator('.project-approach').count(),0);
    assert.equal(await page.locator('.project-detail-page.is-closing').count(),0);
    assert((await page.locator('.project-painting-stage img').getAttribute('src')).includes(id+'.'));
  }
  async function assertPlaced(id){
    await detail().waitFor({state:'detached'});
    const result=await page.evaluate(async id=>{
      const art=window.__TRIAD__.getArtworks().find(a=>a.id===id);
      const {artworkView}=await import('/src/world/artwork-view.js');
      return {state:window.__TRIAD__.state(),expected:artworkView(art,innerWidth/innerHeight),room:art.room};
    },id);
    const {state:s,expected,room}=result;
    assert.equal(s.moving,false);assert.equal(s.selectedArtwork,id);assert.equal(s.room,room);
    assert(Math.hypot(...s.position.map((v,i)=>v-expected.position[i]))<1e-8);
    assert(Math.abs(s.fov-expected.fov)<1e-8);
    const toward=new THREE.Vector3(...expected.target).sub(new THREE.Vector3(...s.position)).normalize();
    const facing=new THREE.Vector3(0,0,-1).applyQuaternion(new THREE.Quaternion(...s.quaternion));
    assert(toward.dot(facing)>1-1e-9);
    assert.equal(await page.locator('.project-approach').count(),0);
    await page.waitForTimeout(300);sameCamera(await state(),s);
    assert.equal(await page.evaluate(()=>document.activeElement.id),`artwork-dot-${id}`);
  }
  async function watch(){
    await page.evaluate(()=>{
      window.__detailNode=document.querySelector('.project-detail-page');window.__detailWatch=[];window.__watchDetail=true;
      const tick=()=>{if(!window.__watchDetail)return;const s=window.__TRIAD__.state();window.__detailWatch.push({position:s.position,quaternion:s.quaternion,fov:s.fov,moving:s.moving,id:document.querySelector('.project-detail-page')?.dataset.artworkId});requestAnimationFrame(tick);};requestAnimationFrame(tick);
    });
  }
  try{
    await page.goto(process.env.PORTFOLIO_URL || 'http://127.0.0.1:4185');
    await page.waitForFunction(()=>window.__TRIAD__,null,{timeout:90000});
    await page.locator('.loading-screen').waitFor({state:'detached',timeout:90000});
    const artworks=await page.evaluate(()=>window.__TRIAD__.getArtworks().map(a=>({id:a.id,room:a.room,name:a.projects[0].name})));
    await open();await watch();const original=await state();
    assert.equal(await detail().getByRole('button',{name:/공간으로 돌아가기/}).count(),0);
    assert.equal(await detail().locator('.project-back').count(),0);
    pass('Detail has one X close control and no return-to-space button');
    const next=()=>detail().locator('.project-detail-header').getByRole('button',{name:'다음 프로젝트',exact:true});
    const previous=()=>detail().locator('.project-detail-header').getByRole('button',{name:'이전 프로젝트',exact:true});
    await next().click();await remains(original,artworks[1].id);
    assert(await next().evaluate(el=>el===document.activeElement));
    assert.equal(await page.locator('#project-detail-title').textContent(),artworks[1].name);
    await previous().click();await remains(original,artworks[0].id);
    pass('Header next/previous instantly replace content without camera movement, remount or focus loss');
    await detail().locator('.project-case-scroll').evaluate(el=>el.scrollTop=900);
    await detail().locator('.project-case-footer').getByRole('button',{name:'다음 프로젝트',exact:true}).click();
    await remains(original,artworks[1].id);
    assert.equal(await detail().locator('.project-case-scroll').evaluate(el=>el.scrollTop),0);
    await previous().click();await remains(original,artworks[0].id);
    pass('Footer navigation follows the same immediate behavior and resets the description scroll');
    await next().evaluate(button=>{for(let i=0;i<11;i++)button.click();});
    await remains(original,artworks[11].id);
    await previous().evaluate(button=>{for(let i=0;i<11;i++)button.click();});
    await remains(original,artworks[0].id);
    pass('Eleven rapid next clicks and eleven previous clicks retain every selection');
    for(let index=1;index<artworks.length;index++){
      await next().click();await remains(original,artworks[index].id);
      assert.equal(await page.locator('#project-detail-title').textContent(),artworks[index].name);
    }
    const watchFrames=await page.evaluate(()=>{window.__watchDetail=false;return window.__detailWatch;});
    for(const frame of watchFrames)sameCamera(frame,original);
    fs.writeFileSync(path.join(out,'browse-frames.json'),JSON.stringify(watchFrames,null,2));
    pass('All 49 artwork pages across three rooms are browsable with a stationary camera and the same detail page');
    await page.screenshot({path:path.join(out,'last-detail.png')});
    const last=artworks.at(-1).id;
    await detail().getByRole('button',{name:'프로젝트 닫기',exact:true}).click();
    await assertPlaced(last);await page.screenshot({path:path.join(out,'last-artwork-after-close.png')});
    pass('X immediately reveals the last selected artwork front-on, in its room, with no animation or drift');

    await open();await watch();const indexOrigin=await state();
    await detail().getByRole('button',{name:'전체 프로젝트',exact:true}).click();
    await page.getByRole('searchbox',{name:'프로젝트 검색'}).fill('On the Book');
    const book=await page.locator('.artwork-index-row').first().getAttribute('data-artwork');
    await page.locator('.artwork-index-row').first().click();
    await detail().waitFor();sameCamera(await state(),indexOrigin);
    const selected=await detail().getAttribute('data-artwork-id');
    assert.notEqual(selected,'A01-01');
    await detail().getByRole('button',{name:'프로젝트 닫기',exact:true}).click();await assertPlaced(selected);
    await page.evaluate(()=>window.__watchDetail=false);
    pass('Choosing another room from the detail index changes content only; X reveals that last artwork');

    for(const [width,height] of [[1920,1080],[1366,768],[1024,768],[390,844],[844,390]]){
      await page.setViewportSize({width,height});await idle();await open();await watch();const before=await state();
      await next().click();await remains(before,artworks[1].id);
      if(width===390){await page.getByRole('button',{name:'크게 보기',exact:true}).click();await page.keyboard.press('Escape');assert.equal(await page.locator('.is-expanded').count(),0);}
      await page.keyboard.press('Escape');await assertPlaced(artworks[1].id);
      await page.evaluate(()=>window.__watchDetail=false);
      pass(`${width}x${height}: immediate browsing, Escape close and frontal placement remain accessible`);
    }
    await page.setViewportSize({width:1366,height:768});
    await page.evaluate(()=>window.__TRIAD__.goTo('lobby'));
    await page.getByRole('button',{name:'전체 프로젝트',exact:true}).click();
    await page.getByRole('searchbox',{name:'프로젝트 검색'}).fill('Planit');
    const origin=await state();await page.locator('.artwork-index-row').first().click();
    await page.getByRole('button',{name:'프로젝트 이동 취소',exact:true}).click({force:true});await idle();
    sameCamera(await state(),origin);assert.equal(await detail().count(),0);
    await page.waitForTimeout(350);assert.equal(await detail().count(),0);
    pass('Cancelling an initial animated approach still returns to its entry point without opening a stale detail');
    assert.deepEqual(errors,[]);pass('No runtime errors');
  }catch(error){failure={message:error.message,stack:error.stack};await page.screenshot({path:path.join(out,'failure.png')}).catch(()=>{});throw error;}
  finally{if(!failure)fs.rmSync(path.join(out,'failure.png'),{force:true});fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({passed:!failure,checks,errors,failure},null,2));await browser.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
