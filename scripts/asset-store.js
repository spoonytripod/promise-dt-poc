/* 자산 관리 전용 IndexedDB. 상태와 파일을 같은 트랜잭션으로 저장합니다. */
(function (root) {
  'use strict';
  const DB_NAME = 'promise-asset-prototype-v1';
  let opening;
  function open() {
    if (!opening) opening = new Promise((resolve, reject) => {
      const r = indexedDB.open(DB_NAME, 1);
      r.onupgradeneeded = () => { r.result.createObjectStore('data'); r.result.createObjectStore('files'); };
      r.onsuccess = () => { r.result.onversionchange = () => { r.result.close(); opening = null; }; resolve(r.result); };
      r.onerror = () => { opening = null; reject(r.error); };
      r.onblocked = () => { opening = null; reject(new Error('다른 창을 닫은 뒤 저장소를 다시 여십시오.')); };
    });
    return opening;
  }
  async function local(method, args = {}) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const write = ['commit', 'init', 'reset'].includes(method);
      const tx = db.transaction(['data', 'files'], write ? 'readwrite' : 'readonly');
      let result, failure;
      tx.oncomplete = () => resolve(result);
      tx.onabort = () => reject(failure || tx.error || new Error('저장에 실패했습니다.'));
      tx.onerror = () => {};
      const data = tx.objectStore('data'), files = tx.objectStore('files');
      if (method === 'file') {
        const r = files.get(args.id); r.onsuccess = () => { result = r.result; };
      } else {
        const r = data.get('state');
        r.onsuccess = () => {
          try {
          const current = r.result;
          if (method === 'read' || (method === 'init' && current)) { result = current; return; }
          if (!write) { failure = new Error('지원하지 않는 저장 요청입니다.'); tx.abort(); return; }
          if (method === 'commit' && (current?.revision || 0) !== args.expected) {
            failure = new Error('다른 창에서 데이터가 변경되었습니다. 새로고침 후 다시 시도하십시오.'); tx.abort(); return;
          }
          if (!args.state || args.state.schema !== 1) { failure = new Error('저장 데이터 버전이 올바르지 않습니다.'); tx.abort(); return; }
          result = { ...args.state, revision: (current?.revision || 0) + 1 };
          if (method === 'reset') files.clear();
          for (const f of args.putFiles || []) files.put(f.blob, f.id);
          for (const id of args.deleteFiles || []) files.delete(id);
          data.put(result, 'state');
          } catch (error) { failure = error; tx.abort(); }
        };
      }
    });
  }
  const pending = new Map();
  if (root.ASSET_STANDALONE_CLIENT) root.addEventListener('message', e => {
    if (e.source !== root.parent || e.data?.type !== 'asset-store:response') return;
    const p = pending.get(e.data.id); if (!p) return;
    pending.delete(e.data.id); clearTimeout(p.timer);
    e.data.ok ? p.resolve(e.data.value) : p.reject(new Error(e.data.error));
  });
  function request(method, args) {
    if (!root.ASSET_STANDALONE_CLIENT) return local(method, args);
    return new Promise((resolve, reject) => {
      const id = 'request-' + Date.now() + '-' + Math.random().toString(36).slice(2);
      const timer = setTimeout(() => { pending.delete(id); reject(new Error('저장 응답 시간이 초과되었습니다. 새로고침으로 저장 상태를 확인하십시오.')); }, 30000);
      pending.set(id, { resolve, reject, timer });
      root.parent.postMessage({ type: 'asset-store:request', id, method, args }, '*');
    });
  }
  function serve(frame) {
    root.addEventListener('message', async e => {
      if (e.source !== frame.contentWindow || e.data?.type !== 'asset-store:request') return;
      const { id, method, args } = e.data;
      if (typeof id !== 'string' || !['read', 'init', 'commit', 'reset', 'file'].includes(method)) return;
      try { e.source.postMessage({ type: 'asset-store:response', id, ok: true, value: await local(method, args) }, '*'); }
      catch (err) { e.source.postMessage({ type: 'asset-store:response', id, ok: false, error: err.message }, '*'); }
    });
  }
  root.AssetStore = { request, serve, DB_NAME };
})(globalThis);
