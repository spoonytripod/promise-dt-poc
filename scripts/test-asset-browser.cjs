const {chromium}=require('playwright');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const out=path.join(root,'docs','asset-validation');fs.mkdirSync(out,{recursive:true});
const report=[];
async function assetFrame(p,mode){
  if(mode==='web'){await p.waitForFunction(()=>globalThis.AssetApp?.ready);return p;}
  const f=await p.locator('#frame-page_asset').contentFrame();
  await f.locator('#asset-nav').waitFor({state:'attached'});
  await f.locator('[data-action="menu"][data-id="assets"]').waitFor({state:'attached'});f.testPage=p;
  return f;
}
async function fillForm(f,values){for(const [key,value]of Object.entries(values)){const el=f.locator('#editor [name="'+key+'"]');if(await el.evaluate(e=>e.tagName)==='SELECT')await el.selectOption(value);else await el.fill(value);}await f.locator('#editor button[type="submit"]').click();await f.locator('#modal').waitFor({state:'hidden'});}
async function readState(f){return await f.locator('body').evaluate(()=>AssetApp.state);}
async function saveDirect(f,command){return await f.locator('body').evaluate((_,c)=>AssetApp.execute(c),command);}
async function action(f,name,id){if(name==='close'){await f.locator('#modal-close').click();return;}let selector=`[data-action="${name}"]`;if(id!==undefined)selector+=`[data-id="${id}"]`;await f.locator(selector).first().click();}
async function download(f,fn){const p=f.testPage||f;const wait=p.waitForEvent('download');await fn();const d=await wait;const file=path.join(out,d.suggestedFilename());await d.saveAs(file);return file;}
(async()=>{
  for(const [browser,executablePath]of [['Chrome','C:/Program Files/Google/Chrome/Application/chrome.exe'],['Edge','C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe']]) {
    for(const mode of ['web','file']){
      const profile=fs.mkdtempSync(path.join(os.tmpdir(),'asset-flow-'));
      let ctx=await chromium.launchPersistentContext(profile,{executablePath,headless:true,viewport:{width:1920,height:1080},acceptDownloads:true});
      try {
        // 자산 화면은 외부 라이브러리 없이 동작해야 함. 폰트와 다른 메뉴의 외부 요청 차단.
        await ctx.route(/^https?:\/\/(?!localhost:8000)/,r=>r.abort());
        let p=await ctx.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));
        const url=mode==='web'?'http://localhost:8000/pages/page-asset.html':'file:///'+path.join(root,'demo_standalone.html').replace(/\\/g,'/');
        await p.goto(url);let f=await assetFrame(p,mode);
        if(mode==='file') {
          // 기본 로그인 예시와 실제 상단 메뉴로 자산 화면에 진입
          const login=p.locator('#frame-login').contentFrame();await login.locator('#btn-login').click();await p.locator('#frame-main.active').waitFor();
          const main=p.locator('#frame-main').contentFrame();await main.locator('[onclick="closeMainNotice()"]').first().click();
          await main.locator('.dock-item[data-href="page-asset.html"]').click();await p.locator('#frame-page_asset.active').waitFor();
        }
        const init=await readState(f);assert.equal(init.assets.length,6);
        assert.equal(await f.locator('body').evaluate(()=>XLSX.version),'0.20.3');
        const pumpRow=f.locator('#workspace tbody tr').filter({hasText:'SWRO 고압펌프'});assert.match(await pumpRow.textContent(),/가동/);assert.match(await pumpRow.textContent(),/기한 초과/);
        await action(f,'scope','spare');assert.equal(await f.locator('#workspace tbody tr').count(),2);
        await action(f,'scope','tag:T03');assert.match(await f.locator('.tag-info').textContent(),/설치된 자산이 없습니다/);
        await action(f,'scope','tag:T04');assert.match(await f.locator('.tag-info').textContent(),/태그 정보만/);
        await action(f,'filter-clear');
        await action(f,'asset-new');
        await fillForm(f,{no:'UI001',name:'화면 검증 펌프',en:'UI Pump',classId:'CL01',manufacturerId:'MF01',managerId:'MG01'});
        let s=await readState(f),a=s.assets.find(a=>a.no==='UI001');assert(a);
        await action(f,'detail',a.id);await action(f,'asset-edit',a.id);await fillForm(f,{model:'MODEL-EDIT'});
        await action(f,'detail',a.id);await action(f,'life-install',a.id);await fillForm(f,{tagId:'T03',date:'2026-09-01',reason:'화면 검증 설치'});
        s=await readState(f);assert.equal(s.installations.find(i=>!i.end&&i.assetId===a.id).tagId,'T03');
        await action(f,'detail',a.id);await action(f,'life-detach',a.id);await fillForm(f,{date:'2026-09-02',reason:'화면 검증 해체'});
        await action(f,'detail','A2');await action(f,'life-replace','A2');await fillForm(f,{newAssetId:a.id,date:'2026-09-03',reason:'화면 교체 검증',oldStatus:'예비'});
        s=await readState(f);assert.equal(s.installations.find(i=>!i.end&&i.tagId==='T02').assetId,a.id);
        await action(f,'menu','maintenance');await action(f,'record-new','PLAN1');await fillForm(f,{date:'2026-09-15',performer:'화면 검증자',result:'정상',action:'진동 확인',nextDue:'2026-10-15'});
        s=await readState(f);assert.equal(s.records.at(-1).assetId,a.id);assert.equal(s.plans[0].due,'2026-10-15');
        await action(f,'record-edit',s.records.at(-1).id);await fillForm(f,{action:'조치 기록 수정'});
        await action(f,'plan-new');await fillForm(f,{target:'asset:A2',item:'보관 상태 확인',months:'2',due:'2026-11-01'});
        await action(f,'menu','documents');await action(f,'document-new');
        await f.locator('#editor [name="file"]').setInputFiles({name:'검증 원본.txt',mimeType:'text/plain',buffer:Buffer.from('첨부파일 원본 검증\n')});
        await fillForm(f,{title:'매우 긴 문서 제목 '.repeat(15),target:'asset:'+a.id,description:'문서 다운로드와 공통 참조 확인'});
        s=await readState(f);const doc=s.documents.at(-1);
        await action(f,'link-new',doc.id);await fillForm(f,{target:'tag:T02'});
        await action(f,'link-new',doc.id);await fillForm(f,{target:'process:PR02'});
        await p.screenshot({path:path.join(out,browser+'-'+mode+'-documents.png')});
        const downloaded=await download(f,()=>action(f,'download',doc.id));assert.equal(fs.readFileSync(downloaded,'utf8'),'첨부파일 원본 검증\n');
        // 다른 대상 참조가 있으면 파일 삭제 차단. 이전 상태 유지.
        const rev=(await readState(f)).revision;
        await assert.rejects(()=>saveDirect(f,{type:'documentRemove',id:doc.id}),/모든 연결/);
        assert.equal((await readState(f)).revision,rev);
        await action(f,'menu','assets');await action(f,'detail',a.id);await action(f,'detail-tab','문서');assert.equal(await f.locator('#modal-body tbody tr').count(),2); // 예시 문서 + 신규 공통 문서
        await action(f,'close');await action(f,'import-open');
        const templateFile=await download(f,()=>action(f,'template'));
        assert(templateFile.endsWith('.xlsx'));
        // 실제 xlsx 오류 검토와 정상 등록
        const makeXlsx=async rows=>await f.locator('body').evaluate((_,rows)=>{const w=XLSX.utils.book_new();XLSX.utils.book_append_sheet(w,XLSX.utils.json_to_sheet(rows),'자산대장');return Array.from(XLSX.write(w,{bookType:'xlsx',type:'array'}) instanceof ArrayBuffer?new Uint8Array(XLSX.write(w,{bookType:'xlsx',type:'array'})):[]);},rows);
        const excel=no=>({'자산번호':no,'자산명':'엑셀 예비','영문 자산명':'Excel Spare','설비 유형 코드':'CL01','중요도':'B','운영 상태':'예비'});
        let bytes=await makeXlsx([excel('X001'),excel('A00001')]);
        await f.locator('#import-file').setInputFiles({name:'오류.xlsx',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer:Buffer.from(bytes)});
        await f.locator('#import-review').getByText(/중복 자산번호/).waitFor();assert(await f.locator('#import-commit').isDisabled());
        s=await readState(f);assert(!s.assets.some(x=>x.no==='X001'));
        bytes=await makeXlsx(Array.from({length:15},(_,i)=>excel('X'+String(i+1).padStart(3,'0'))));
        await f.locator('#import-file').setInputFiles({name:'정상.xlsx',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer:Buffer.from(bytes)});
        await f.locator('#import-commit').waitFor({state:'visible'});await f.locator('#import-commit').click();await f.locator('#modal').waitFor({state:'hidden'});
        const exported=await download(f,()=>action(f,'export'));
        const exportedRows=await f.locator('body').evaluate(async(_,arr)=>XLSX.utils.sheet_to_json(XLSX.read(new Uint8Array(arr),{type:'array'}).Sheets['자산대장']).length,Array.from(fs.readFileSync(exported)));
        assert.equal(exportedRows,22); // 현재 페이지 10행보다 많은 전체 결과
        await f.locator('#filters [name="search"]').fill('X001');await f.locator('#filters button[type="submit"]').click();assert.equal(await f.locator('#workspace tbody tr').count(),1);
        await f.locator('#filters [name="location"]').selectOption('PR01');await f.locator('#filters button[type="submit"]').click();assert.match(await f.locator('#workspace tbody').textContent(),/조회 결과가 없습니다/);
        await action(f,'filter-clear');await action(f,'menu','masters');await action(f,'master-edit','manufacturers:MF01');await fillForm(f,{active:'비활성'});
        await action(f,'master-new','classes');await fillForm(f,{code:'CL99',name:'예시 추가 분류',en:'Additional Type'});
        await action(f,'master-new','manufacturers');await fillForm(f,{code:'MF99',name:'신규 예시 제조사',contact:'000-0000-0000'});
        await action(f,'master-new','managers');await fillForm(f,{code:'MG99',name:'신규 예시 관리기관',department:'관리팀',person:'가상 담당자'});
        await action(f,'master-new','tags');await fillForm(f,{no:'P-TEST',name:'화면 검증 태그',kind:'설비',processId:'PR02',parentId:'T02',drawing:'TEST-PID Rev.A'});
        s=await readState(f);const newTag=s.tags.find(t=>t.no==='P-TEST');assert(newTag);
        await action(f,'master-edit','tags:'+newTag.id);await fillForm(f,{no:'P-TEST-REV',drawing:'TEST-PID Rev.B'});assert((await readState(f)).tags.some(t=>t.id===newTag.id&&t.no==='P-TEST-REV'));
        await action(f,'menu','assets');await action(f,'asset-new');assert.equal(await f.locator('#editor [name="manufacturerId"] option[value="MF01"]').count(),0);await action(f,'close');
        await action(f,'detail',a.id);await action(f,'life-dispose',a.id);await fillForm(f,{date:'2026-10-01',reason:'폐기 검증'});
        await action(f,'scope','tag:T02');assert.match(await f.locator('.tag-info').textContent(),/설치된 자산이 없습니다/);
        await action(f,'menu','changes');await action(f,'change-detail',(await readState(f)).changes.at(-1).id);assert.match(await f.locator('#modal-body').textContent(),/폐기 검증/);await action(f,'close');
        const day=await f.locator('body').evaluate(()=>AssetDomain.today());
        await f.locator('#change-filter [name="changeSearch"]').fill('UI001');await f.locator('#change-filter [name="changeKind"]').selectOption('dispose');await f.locator('#change-filter [name="from"]').fill(day);await f.locator('#change-filter [name="to"]').fill(day);await f.locator('#change-filter button').click();assert.equal(await f.locator('#workspace tbody tr').count(),1);
        await action(f,'menu','assets');await action(f,'filter-clear');
        await p.screenshot({path:path.join(out,browser+'-'+mode+'.png')});
        // 저장 실패를 주입하여 화면이 성공 메시지나 임시 메모리 상태로 진행하지 않는지 검사
        const failure=await f.locator('body').evaluate(async()=>{const original=AssetStore.request,before=AssetApp.state;AssetStore.request=async(method,args)=>{if(method==='commit')throw new Error('검증용 QuotaExceededError');return original(method,args);};let message;try{await AssetApp.execute({type:'assetSave',value:{...before.assets[0],name:'저장 실패 값'}});}catch(e){message=e.message;}AssetStore.request=original;return {message,unchanged:JSON.stringify(before)===JSON.stringify(AssetApp.state),notice:document.querySelector('#notice').textContent};});
        assert(failure.unchanged);assert.match(failure.notice,/저장하지 못했습니다/);
        // 오래된 revision의 저장을 차단
        const conflict=await f.locator('body').evaluate(async()=>{const s=AssetApp.state;try{await AssetStore.request('commit',{state:s,expected:s.revision-1});return false;}catch(e){return /다른 창/.test(e.message);}});assert(conflict);
        await p.reload();f=await assetFrame(p,mode);assert((await readState(f)).assets.some(x=>x.no==='UI001'));
        if(mode==='file')await p.evaluate(()=>{document.querySelectorAll('.page-frame').forEach(x=>x.classList.remove('active'));document.getElementById('frame-page_asset').classList.add('active');});
        await ctx.close();
        ctx=await chromium.launchPersistentContext(profile,{executablePath,headless:true,viewport:{width:1920,height:1080},acceptDownloads:true});await ctx.route(/^https?:\/\/(?!localhost:8000)/,r=>r.abort());p=await ctx.newPage();await p.goto(url);f=await assetFrame(p,mode);
        assert.equal((await readState(f)).assets.length,22);
        const restored=await f.locator('body').evaluate(async(_,id)=>await(await AssetStore.request('file',{id})).text(),doc.id);assert.equal(restored,'첨부파일 원본 검증\n');
        if(mode==='file')await p.evaluate(()=>{document.querySelectorAll('.page-frame').forEach(x=>x.classList.remove('active'));document.getElementById('frame-page_asset').classList.add('active');});
        await p.evaluate(()=>localStorage.setItem('other-menu-probe','preserve'));
        p.on('dialog',d=>d.accept());await f.locator('#reset').click();await f.locator('body').evaluate(()=>new Promise(resolve=>{const t=setInterval(()=>{if(AssetApp.state.assets.length===6){clearInterval(t);resolve();}},50);}));
        assert.equal(await p.evaluate(()=>localStorage.getItem('other-menu-probe')),'preserve');
        assert.equal(await f.locator('body').evaluate(async(_,id)=>await AssetStore.request('file',{id}),doc.id),undefined);
        if(mode==='file'){
          await f.locator('.dock-item[data-href="page-diagnostics.html"]').click();await p.locator('#frame-page_diagnostics.active').waitFor();
          const diag=p.locator('#frame-page_diagnostics').contentFrame();await diag.locator('.dock-item[data-href="page-asset.html"]').click();await p.locator('#frame-page_asset.active').waitFor();
        }else{
          await f.locator('.dock-item[data-href="page-diagnostics.html"]').click();await p.waitForURL('**/page-diagnostics.html');await p.locator('.dock-item[data-href="page-asset.html"]').click();await p.waitForURL('**/page-asset.html');await p.waitForFunction(()=>AssetApp.ready);
        }
        assert.deepEqual(errors,[]);
        report.push({browser,mode,result:'PASS',features:'AM-01~18 주요 화면 및 저장 시나리오, xlsx, Blob 다운로드, 재실행, 초기화, 자산과 진단 메뉴 왕복',errors});
        console.log(browser,mode,'PASS');
      }finally{await ctx.close();}
    }
  }
  fs.writeFileSync(path.join(out,'browser-results.json'),JSON.stringify(report,null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
