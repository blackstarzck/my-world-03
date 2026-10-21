const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "C:/Users/buche/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
const fs = require("node:fs"), path = require("node:path"), assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const out = path.resolve("output/browser-checks/camera-demo");
fs.mkdirSync(path.join(out,"raw"),{recursive:true});

async function main() {
  const THREE = await import("three");
  const browser=await chromium.launch({headless:true,
    executablePath:process.env.CHROMIUM_PATH || "C:/Users/buche/AppData/Local/ms-playwright/chromium-1223/chrome-win64/chrome.exe"});
  const context=await browser.newContext({viewport:{width:1366,height:768},deviceScaleFactor:1,
    reducedMotion:"reduce",recordVideo:{dir:path.join(out,"raw"),size:{width:1366,height:768}}});
  const page=await context.newPage(), video=page.video(), marks=[], checks=[], errors=[];
  const idle=()=>page.waitForFunction(()=>!window.__TRIAD__.state().moving,null,{timeout:60000});
  const state=()=>page.evaluate(()=>window.__TRIAD__.state());
  page.on("pageerror",e=>errors.push(e.message));
  async function banner(text) {
    await page.evaluate(text=>document.getElementById('demo-banner').textContent=text,text);
  }
  async function detail() {
    await page.locator('.project-detail-page').waitFor({timeout:60000});
    await page.waitForFunction(()=>Number(getComputedStyle(document.querySelector('.project-detail-page')).opacity)>.999);
  }
  async function moveTo(locator) { await locator.hover(); await page.waitForTimeout(240); }
  async function clickCanvas() {
    const canvas=page.locator('.world canvas'), box=await canvas.boundingBox();
    await page.mouse.move(box.x+box.width/2,box.y+box.height/2,{steps:10});
    await page.waitForTimeout(200);
    await page.mouse.click(box.x+box.width/2,box.y+box.height/2);
  }
  async function close() {
    const button=page.getByRole('button',{name:'프로젝트 닫기',exact:true});
    await moveTo(button); await button.click();
    await page.locator('.project-detail-page').waitFor({state:'detached'}); await idle();
  }
  async function restored(origin,label) {
    await idle(); const s=await state();
    assert(Math.hypot(...s.position.map((v,i)=>v-origin.position[i]))<1e-7,label+' position');
    assert(new THREE.Quaternion(...s.quaternion).angleTo(new THREE.Quaternion(...origin.quaternion))<1e-7,label+' gaze');
    assert(Math.abs(s.fov-origin.fov)<1e-7,label+' lens');
    assert.equal(await page.locator('.project-detail-page').count(),0);
    checks.push(label); console.log('RECORDED '+label);
  }
  function begin(id,title) { const mark={id,title,start:Date.now()}; marks.push(mark);return mark; }
  function end(mark) { mark.end=Date.now(); }
  try {
    await page.goto(process.env.PORTFOLIO_URL || 'http://127.0.0.1:4185');
    await page.waitForFunction(()=>window.__TRIAD__,null,{timeout:90000});
    await page.locator('.loading-screen').waitFor({state:'detached',timeout:90000});
    await page.evaluate(()=>{window.__TRIAD__.goTo('01');window.__TRIAD__.focusArtwork('A01-01');});
    await idle();
    // Preparation only. Every recorded camera transition below uses actual
    // keyboard, pointer and product controls at normal animation speed.
    await page.evaluate(()=>{const v=window.__TRIAD__.captureView();v.fov=59;window.__TRIAD__.restoreView(v);});
    await idle();await page.emulateMedia({reducedMotion:'no-preference'});
    await page.evaluate(()=>{
      const style=document.createElement('style');style.textContent=`
        #demo-banner{position:fixed;z-index:20000;top:84px;left:50%;transform:translateX(-50%);padding:11px 22px;border:1px solid #ffffff28;border-radius:99px;background:#142b29ed;color:#fffbed;font:600 16px system-ui,sans-serif;white-space:nowrap;pointer-events:none;box-shadow:0 6px 25px #0002}
        #demo-cursor{position:fixed;z-index:20001;width:17px;height:17px;border:2px solid #ed8355;border-radius:50%;background:#fff9;transform:translate(-50%,-50%);pointer-events:none;left:683px;top:384px}`;
      document.head.append(style);
      const banner=document.createElement('div');banner.id='demo-banner';document.body.append(banner);
      const cursor=document.createElement('div');cursor.id='demo-cursor';document.body.append(cursor);
      document.addEventListener('pointermove',e=>{cursor.style.left=e.clientX+'px';cursor.style.top=e.clientY+'px';});
      document.addEventListener('pointerdown',()=>cursor.animate([{boxShadow:'0 0 0 0 #ed8355bb'},{boxShadow:'0 0 0 18px #ed835500'}],{duration:400}));
      window.__demoFrames=[];window.__demoSampling=true;
      const tick=()=>{if(!window.__demoSampling)return;const s=window.__TRIAD__.state();window.__demoFrames.push({time:Date.now(),position:s.position,quaternion:s.quaternion,fov:s.fov,kind:s.motionKind,moving:s.moving});requestAnimationFrame(tick);};requestAnimationFrame(tick);
    });
    const first=begin('01-open-close','가까이 접근 → 작품 선택 → 닫기');
    await banner('01 · 작품 가까이 접근');await page.waitForTimeout(950);
    await page.locator('.world canvas').focus();await page.keyboard.down('w');
    await page.waitForFunction(()=>{const a=window.__TRIAD__.getArtworks().find(a=>a.id==='A01-01'),p=window.__TRIAD__.state().position;return p.reduce((s,v,i)=>s+(v-a.target[i])*a.normal[i],0)<.38;});
    await page.keyboard.up('w');
    const art=await page.evaluate(()=>{const a=window.__TRIAD__.getArtworks().find(a=>a.id==='A01-01');return {target:a.target,normal:a.normal};});
    const walking=await state(), delta=art.target.map((v,i)=>v-walking.position[i]);
    const desiredPitch=Math.atan2(delta[1],Math.hypot(delta[0],delta[2]));
    const dy=(walking.pitch-desiredPitch)/.0023;
    await page.mouse.move(750,180);await page.mouse.down();
    await page.mouse.move(750,180+dy,{steps:12});await page.mouse.up();
    const origin=await state();
    const depth=origin.position.reduce((s,v,i)=>s+(v-art.target[i])*art.normal[i],0);
    assert(depth<.4 && depth>0,'actually standing close to canvas');
    await banner('01 · 가까이서 선택 — 작품을 보며 뒤로 이동');await page.waitForTimeout(850);
    await page.screenshot({path:path.join(out,'poster.png')});
    await clickCanvas();await detail();await page.waitForTimeout(1000);
    await banner('01 · 우측 X — 같은 경로로 원위치 복귀');await page.waitForTimeout(650);
    await close();await restored(origin,'close from near canvas');await page.waitForTimeout(1100);end(first);

    const second=begin('02-cancel','가까이서 선택 → 이동 중 취소');
    await banner('02 · 이동 도중 취소');await page.waitForTimeout(1100);
    await clickCanvas();await page.waitForTimeout(180);
    const cancellingAt=await state();assert(cancellingAt.moving,'cancel happens during movement');
    await page.getByRole('button',{name:'프로젝트 이동 취소',exact:true}).click({force:true,timeout:1500});
    await idle();await restored(origin,'cancel during close approach');
    await banner('02 · 지나온 구간만 되돌아오기');await page.waitForTimeout(1500);end(second);

    const third=begin('03-next-previous-close','다음 → 이전 → 다음 프로젝트 → 닫기');
    await banner('03 · 다음·이전 프로젝트 탐색 후 닫기');await page.waitForTimeout(1000);
    await clickCanvas();await detail();await page.waitForTimeout(650);
    for(const [step,label,id] of [[1,'다음 프로젝트','A01-02'],[-1,'이전 프로젝트','A01-01'],[1,'다음 프로젝트','A01-02']]) {
      await banner('03 · '+label+'로 이동');
      const button=page.locator('.project-detail-header').getByRole('button',{name:label,exact:true});
      await moveTo(button);await button.click();
      await page.waitForFunction(id=>window.__TRIAD__.state().selectedArtwork===id && !window.__TRIAD__.state().moving,id,{timeout:60000});
      await detail();await page.waitForTimeout(850);
    }
    await banner('03 · 다른 작품에서 닫기 — 최초 진입 위치로 복귀');await page.waitForTimeout(900);
    await close();await restored(origin,'close after next and previous navigation');await page.waitForTimeout(1300);end(third);

    const fourth=begin('04-cancel-next','다음 프로젝트로 이동하는 도중 취소');
    await banner('04 · 다음 프로젝트 이동 중 취소');await page.waitForTimeout(1000);
    await clickCanvas();await detail();await page.waitForTimeout(700);
    const next=page.locator('.project-detail-header').getByRole('button',{name:'다음 프로젝트',exact:true});
    await moveTo(next);await next.click();
    await page.waitForFunction(()=>window.__TRIAD__.state().moving && document.querySelector('[aria-label="프로젝트 이동 취소"]'));
    await page.waitForTimeout(280);assert((await state()).moving);
    await page.getByRole('button',{name:'프로젝트 이동 취소',exact:true}).click({force:true,timeout:1500});
    await idle();await restored(origin,'cancel while travelling to next project');
    await banner('04 · 최초 진입 위치·시선·화각 복원');await page.waitForTimeout(1500);end(fourth);
    assert.deepEqual(errors,[]);
    const frames=await page.evaluate(()=>{window.__demoSampling=false;return window.__demoFrames;});
    fs.writeFileSync(path.join(out,'frames.json'),JSON.stringify(frames,null,2));
    fs.writeFileSync(path.join(out,'recording.json'),JSON.stringify({checks,errors,depth,origin,marks},null,2));
  } finally {
    await context.close();await browser.close();
  }
  const raw=await video.path();
  const rawDuration=Number(execFileSync('ffprobe',['-v','error','-show_entries','format=duration','-of','default=nw=1:nk=1',raw],{encoding:'utf8'}).trim());
  // The recorder pads its last frame while shutting down. Align to the actual
  // final caption on screen rather than treating that padding as recorded UI.
  const frameBytes=206*24;
  const pixels=execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-i',raw,
    '-vf','crop=206:24:580:92,format=gray','-f','rawvideo','-'],{maxBuffer:30*1024*1024});
  const frameCount=Math.floor(pixels.length/frameBytes), last=pixels.subarray((frameCount-1)*frameBytes);
  let syncFrame=-1;
  for(let i=0;i<frameCount;i++) {
    let differences=0;
    for(let p=0;p<frameBytes;p++) if((pixels[i*frameBytes+p]>160)!=(last[p]>160))differences++;
    if(differences/frameBytes<.02) {syncFrame=i;break;}
  }
  assert(syncFrame>=0 && syncFrame/25>rawDuration-5,'find final caption in recording');
  const zero=marks.at(-1).end-1500-syncFrame/25*1000;
  fs.writeFileSync(path.join(out,'alignment.json'),JSON.stringify({syncFrame,syncVideoTime:syncFrame/25,zero},null,2));
  const encode=(start,duration,destination)=>execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-y','-ss',String(Math.max(0,start)),'-i',raw,'-t',String(duration),'-an','-c:v','libx264','-preset','fast','-crf','20','-pix_fmt','yuv420p','-movflags','+faststart',destination],{stdio:'pipe'});
  const start=(marks[0].start-zero)/1000;
  encode(start,(marks.at(-1).end-marks[0].start)/1000,path.join(out,'camera-demo.mp4'));
  for(const mark of marks) {
    encode((mark.start-zero)/1000,(mark.end-mark.start)/1000,path.join(out,mark.id+'.mp4'));
    mark.at=(mark.start-marks[0].start)/1000;mark.duration=(mark.end-mark.start)/1000;
  }
  fs.writeFileSync(path.join(out,'chapters.json'),JSON.stringify(marks,null,2));
  console.log(JSON.stringify({video:path.join(out,'camera-demo.mp4'),duration:(marks.at(-1).end-marks[0].start)/1000,marks}));
}
main().catch(error=>{console.error(error);process.exitCode=1;});
