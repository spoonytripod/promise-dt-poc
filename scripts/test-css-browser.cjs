/* 이전 커밋과 현재 Web의 모든 요소 및 가상 요소 스타일을 비교하고 단일 HTML을 검사합니다. */
const {chromium}=require('playwright');
const {execFileSync}=require('node:child_process');
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const baseline=process.env.CSS_BASELINE||'c128706';
const pages=fs.readdirSync(path.join(root,'pages')).filter(n=>n.endsWith('.html'));
const out=path.join(root,'docs','css-validation');fs.mkdirSync(out,{recursive:true});
const original=filename=>execFileSync('git',['show',baseline+':'+filename],{cwd:root,encoding:'utf8',maxBuffer:10*1024*1024});
async function snapshot(surface){
  return surface.locator('body').evaluate(()=>{
    function hash(text){let h=2166136261;for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619);}return (h>>>0).toString(16);}
    // 커스텀 변수의 추가 자체가 아니라 그 변수가 적용된 실제 속성을 비교
    return [...document.querySelectorAll('html,body,body *')].filter(e=>!['SCRIPT','STYLE','LINK'].includes(e.tagName)&&!(document.title.startsWith('설계 정보 및 자산 관리')&&e.closest('.lnb'))).map((e,index)=>{
      const styles=['', '::before','::after'].map(p=>{const s=getComputedStyle(e,p||null);return [...s].filter(k=>!k.startsWith('--')).map(k=>k+':'+(e.tagName==='HTML'&&k==='background-color'?'rgb(235, 243, 245)':s.getPropertyValue(k))).join(';');});
      const rect=e.getBoundingClientRect();
      return {index,element:e.tagName,id:e.id,className:typeof e.className==='string'?e.className.replace(/asset-page|dashboard-page|page-(operation|analysis|decision|diagnostics|energy)/g,'').trim():e.className.baseVal,styles:styles.map(hash),box:[rect.x,rect.y,rect.width,rect.height].map(v=>Math.round(v*100)/100)};
    });
  });
}
async function freeze(p){
  await p.addInitScript(()=>{let seed=42;Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};});
  await p.clock.install({time:new Date('2026-10-02T01:00:00Z')});
  await p.clock.pauseAt(new Date('2026-10-02T01:00:01Z'));
}
async function prepare(surface,name){
  if(name==='page-asset.html')await surface.locator('[data-action="menu"][data-id="assets"]').waitFor({state:'attached'});
  else if(name!=='login.html')await surface.locator('#dock').waitFor({state:'attached'});
  await surface.locator('body').evaluate(()=>{
    const s=document.createElement('style');s.textContent='*,*::before,*::after{transition:none!important}';document.head.append(s);
    // 등장 효과는 끝난 상태로, 반복 효과는 동일한 시점으로 고정합니다.
    for(const a of document.getAnimations()){a.pause();const end=a.effect?.getComputedTiming().endTime;a.currentTime=Number.isFinite(end)?end:1000;}
  });
}
(async()=>{
  const report=[];
  for(const [browser,executablePath]of [['Chrome','C:/Program Files/Google/Chrome/Application/chrome.exe'],['Edge','C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe']]){
    const b=await chromium.launch({executablePath,headless:true});
    try {
      for(const name of pages){
        const results=[];
        for(const old of [true,false]){
          const ctx=await b.newContext({viewport:{width:1920,height:1080}});
          await ctx.route(/^https?:\/\/(?!localhost:8000)/,r=>r.abort());
          if(old)await ctx.route('http://localhost:8000/**',async r=>{
            const file=decodeURIComponent(new URL(r.request().url()).pathname.slice(1));
            if(file==='pages/'+name||file==='scripts/shared-navbar.js'||file==='scripts/asset-ui.css')return r.fulfill({body:original(file),contentType:file.endsWith('.html')?'text/html':file.endsWith('.js')?'text/javascript':'text/css'});
            return r.continue();
          });
          const p=await ctx.newPage();await freeze(p);const errors=[];p.on('pageerror',e=>errors.push(e.message));
          await p.goto('http://localhost:8000/pages/'+name);await prepare(p,name);
          results.push({snapshot:await snapshot(p),errors});
          if(!old)await p.screenshot({path:path.join(out,browser+'-'+name.replace('.html','.png'))});
          await ctx.close();
        }
        const differences=results[1].snapshot.filter((e,i)=>JSON.stringify(e)!==JSON.stringify(results[0].snapshot[i]));
        if(differences.length)fs.writeFileSync(path.join(out,'differences-'+name+'.json'),JSON.stringify({before:results[0].snapshot.filter((e,i)=>JSON.stringify(e)!==JSON.stringify(results[1].snapshot[i])),after:differences},null,2));
        assert.equal(differences.length,0,browser+' '+name+' computed style difference');
        const differenceFile=path.join(out,'differences-'+name+'.json');if(fs.existsSync(differenceFile))fs.unlinkSync(differenceFile);
        assert.deepEqual(results[1].errors,results[0].errors,browser+' '+name+' new script errors');
        report.push({browser,page:name,mode:'web',result:'PASS',elements:results[1].snapshot.length,computedStyleDifferences:0,baseline});
        console.log(browser,name,'PASS computed styles');
      }
      // 전체 메뉴의 축소 화면과 이전 HTML 캐시 조합을 재현합니다.
      for(const viewport of [{width:1600,height:900},{width:1366,height:768},{width:2048,height:983}]){
        const responsive=await b.newContext({viewport});
        await responsive.route(/^https?:\/\/(?!localhost:8000)/,r=>r.abort());
        const screen=await responsive.newPage();
        for(const name of pages){
          await screen.goto('http://localhost:8000/pages/'+name);await prepare(screen,name);
          const layout=await screen.evaluate(()=>{
            const dock=document.querySelector('#dock'),box=dock?.getBoundingClientRect();
            const items=[...document.querySelectorAll('#dock .dock-icon-wrap')];
            return {background:getComputedStyle(document.documentElement).backgroundColor,
              display:dock&&getComputedStyle(dock).display, count:items.length,
              contained:items.every(e=>{const r=e.getBoundingClientRect();return r.left>=box.left&&r.right<=box.right&&r.top>=box.top&&r.bottom<=box.bottom;})};
          });
          assert.equal(layout.background,'rgb(235, 243, 245)');
          if(name!=='login.html'){assert.equal(layout.display,'flex');assert.equal(layout.count,9);assert(layout.contained);}
          report.push({browser,page:name,mode:'viewport',viewport,result:'PASS',...layout});
          if(name==='page-operation.html'&&viewport.width===2048)await screen.screenshot({path:path.join(out,browser+'-operation-window.png')});
        }
        await responsive.close();
      }
      for(const name of ['page-operation.html','page-analysis.html','page-decision.html','page-diagnostics.html']){
        const cached=await b.newContext({viewport:{width:1600,height:900}});
        await cached.route(/^https?:\/\/(?!localhost:8000)/,r=>r.abort());
        await cached.route('http://localhost:8000/pages/'+name,r=>r.fulfill({body:original('pages/'+name),contentType:'text/html'}));
        let releaseStyles;
        const stylesReady=new Promise(resolve=>{releaseStyles=resolve;});
        await cached.route('http://localhost:8000/styles/*.css',async r=>{await stylesReady;await r.continue();});
        const screen=await cached.newPage();await screen.goto('http://localhost:8000/pages/'+name,{waitUntil:'domcontentloaded'});
        await screen.locator('#dock').waitFor({state:'attached'});
        assert.equal(await screen.locator('#dock').evaluate(e=>getComputedStyle(e).visibility),'hidden');
        releaseStyles();
        await screen.waitForFunction(()=>getComputedStyle(document.querySelector('.dock-inner')).display==='flex'&&getComputedStyle(document.querySelector('#dock')).visibility==='visible');
        assert.equal(await screen.evaluate(()=>getComputedStyle(document.documentElement).backgroundColor),'rgb(235, 243, 245)');
        assert.equal(await screen.locator('link[href$="navbar.css"]').count(),1);
        await screen.reload();assert.equal(await screen.locator('link[href$="navbar.css"]').count(),1);
        report.push({browser,page:name,mode:'cached-html',result:'PASS'});await cached.close();
      }
      const ctx=await b.newContext({viewport:{width:1920,height:1080}});
      await ctx.route(/^https?:\/\//,r=>r.abort());
      const p=await ctx.newPage();await freeze(p);const errors=[];p.on('pageerror',e=>errors.push(e.message));
      await p.goto('file:///'+path.join(root,'demo_standalone.html').replace(/\\/g,'/'));
      for(const name of pages){
        const id=name.replace('.html','').replaceAll('-','_');
        await p.evaluate(id=>{document.querySelectorAll('.page-frame').forEach(f=>f.classList.remove('active'));document.getElementById('frame-'+id).classList.add('active');},id);
        const f=p.locator('#frame-'+id).contentFrame();await prepare(f,name);
        const styleInfo=await f.locator('body').evaluate(()=>({localLinks:[...document.querySelectorAll('link[rel="stylesheet"]')].filter(l=>!/^https?:/.test(l.getAttribute('href'))).length,width:getComputedStyle(document.body).width,styles:document.styleSheets.length,dock:document.querySelector('#dock')&&getComputedStyle(document.querySelector('#dock')).height}));
        assert.equal(styleInfo.localLinks,0);assert.equal(styleInfo.width,'1920px');assert(styleInfo.styles>=3);if(name!=='login.html')assert.equal(styleInfo.dock,'84px');
        report.push({browser,page:name,mode:'file',result:'PASS',...styleInfo});
      }
      assert.deepEqual(errors,[]);await ctx.close();
    }finally{await b.close();}
  }
  fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(report,null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
