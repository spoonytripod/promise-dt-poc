// 실행: NODE_PATH에 Playwright 설치 경로 지정 후 node scripts/test-asset-storage.cjs
const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const store = fs.readFileSync(path.join(__dirname, 'asset-store.js'), 'utf8');
const fixture = path.join(root, 'asset-storage-probe.html');
const child = '<script>window.ASSET_STANDALONE_CLIENT=true;</script><script>' + store + '</script>';
fs.writeFileSync(fixture, '<script>' + store + '</script><iframe id="probe"></iframe><script>AssetStore.serve(probe);probe.src=URL.createObjectURL(new Blob([' + JSON.stringify(child).replace(/</g, '\\u003c') + '],{type:"text/html"}));</script>');
(async () => {
  try {
    for (const [name, executablePath] of [['Chrome', 'C:/Program Files/Google/Chrome/Application/chrome.exe'], ['Edge', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe']]) {
      for (const mode of ['web', 'file']) {
        const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'asset-storage-'));
        const url = mode === 'web' ? 'http://localhost:8000/asset-storage-probe.html' : 'file:///' + fixture.replace(/\\/g, '/');
        let ctx = await chromium.launchPersistentContext(profile, { executablePath, headless: true });
        let p = await ctx.newPage(); await p.goto(url);
        await p.waitForFunction(() => document.querySelector('iframe').contentWindow);
        let f = p.frames().find(f => f.parentFrame()); await f.waitForFunction(() => !!globalThis.AssetStore);
        await f.evaluate(async () => {
          await AssetStore.request('init', { state: { schema: 1, marker: 'initial' } });
          const s = await AssetStore.request('read');
          await AssetStore.request('commit', { expected: s.revision, state: { ...s, marker: 'persisted' }, putFiles: [{ id: 'probe', blob: new Blob(['첨부파일 원본'], { type: 'text/plain' }) }] });
          let conflict=false;
          try { await AssetStore.request('commit', { expected: s.revision, state: { ...s, marker: 'wrong' }, putFiles: [{ id: 'probe', blob: new Blob(['잘못된 파일']) }] }); } catch (e) { conflict=true; }
          if(!conflict)throw new Error('오래된 revision 저장이 허용됨');
        });
        // 실제 readwrite 트랜잭션 도중 용량 오류를 주입. 앞서 쓴 파일도 롤백해야 합니다.
        const atomic=await p.evaluate(async()=>{
          const s=await AssetStore.request('read'),original=IDBObjectStore.prototype.put;
          let failed=false;
          IDBObjectStore.prototype.put=function(...args){if(this.name==='data')throw new DOMException('검증용 저장 용량 초과','QuotaExceededError');return original.apply(this,args);};
          try {await AssetStore.request('commit',{expected:s.revision,state:{...s,marker:'wrong'},putFiles:[{id:'probe',blob:new Blob(['wrong'])}]});}
          catch(e){failed=e.name==='QuotaExceededError';}finally{IDBObjectStore.prototype.put=original;}
          return {failed,marker:(await AssetStore.request('read')).marker,file:await(await AssetStore.request('file',{id:'probe'})).text()};
        });
        assert.deepEqual(atomic,{failed:true,marker:'persisted',file:'첨부파일 원본'});
        await ctx.close();
        ctx = await chromium.launchPersistentContext(profile, { executablePath, headless: true });
        p = await ctx.newPage(); await p.goto(url);
        f = p.frames().find(f => f.parentFrame()); await f.waitForFunction(() => !!globalThis.AssetStore);
        const result = await f.evaluate(async () => ({ marker: (await AssetStore.request('read')).marker, file: await (await AssetStore.request('file', { id: 'probe' })).text() }));
        assert.deepEqual(result, { marker: 'persisted', file: '첨부파일 원본' });
        console.log(name, mode, 'PASS: 브라우저 재실행 후 상태와 Blob 복원');
        await ctx.close();
      }
    }
  } finally { fs.unlinkSync(fixture); }
})().catch(e => { console.error(e); process.exitCode = 1; });
