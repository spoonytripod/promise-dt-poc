(function () {
  'use strict';
  const D=AssetDomain, $=s=>document.querySelector(s);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const menus={assets:'자산대장',maintenance:'점검과 정비',documents:'도면과 문서',masters:'기준정보',changes:'변경 이력'};
  const kinds={assetSave:'자산 등록과 수정',install:'설치',detach:'해체',replace:'교체',dispose:'폐기',tagSave:'태그 변경',masterSave:'기준정보 변경',masterRemove:'기준정보 삭제 또는 비활성화',planSave:'점검 계획 변경',recordSave:'점검과 정비 기록',documentAdd:'문서 등록',linkAdd:'문서 연결',linkRemove:'연결 해제',documentRemove:'파일 삭제',import:'엑셀 등록',reset:'초기화',교체:'교체'};
  const S={data:null,menu:'assets',scope:'',search:'',location:'',classId:'',importance:'',status:'',sort:'no',page:1,pageSize:10,docSearch:'',planSearch:'',planFilter:'',changeSearch:'',changeKind:'',from:'',to:'',busy:false};
  let importRows=[],lastFocus,modalKind,detailId,detailTab='기본 정보';
  const find=(list,id)=>S.data[list].find(x=>x.id===id);
  const label=(type,id)=>{const x=find({asset:'assets',tag:'tags',process:'processes'}[type],id);return x?(x.no ? x.no+' / ' : '')+x.name:'알 수 없는 대상';};
  const button=(action,text,id='',cls='')=>`<button type="button" data-action="${action}" data-id="${esc(id)}" class="${cls}">${esc(text)}</button>`;
  const options=(items,value,blank='선택 없음')=>`<option value="">${blank}</option>`+items.map(x=>`<option value="${esc(x.id)}" ${x.id===value?'selected':''}>${esc(x.no?x.no+' / '+x.name:x.name)}${x.active===false?' (비활성)':''}</option>`).join('');
  const select=(name,title,items,value='',blank='선택하십시오')=>`<label>${title}<select name="${name}">${options(items,value,blank)}</select></label>`;
  const field=(name,title,value='',type='text',required=false)=>`<label>${title}<input name="${name}" type="${type}" value="${esc(value)}" ${required?'required':''} ${type==='number'?'min="0" step="1"':''}></label>`;
  const textArea=(name,title,value='')=>`<label class="wide">${title}<textarea name="${name}">${esc(value)}</textarea></label>`;
  const simpleSelect=(name,title,values,value)=>select(name,title,values.map(v=>({id:v,name:v})),value);
  const activeOptions=(list,value)=>S.data[list].filter(x=>x.active||x.id===value);
  const badge=(status)=>`<span class="badge ${status==='가동'?'ok':status==='폐기'?'dead':''}">${esc(status)}</span>`;
  const overdue=p=>p.active&&p.due<D.today();
  const planBadge=p=>p.active?`<span class="badge ${overdue(p)?'warn':'ok'}">${overdue(p)?'기한 초과':'예정'}</span>`:'<span class="badge">비활성</span>';
  const table=(heads,rows)=>`<div class="scroll-table"><table><thead><tr>${heads.map(h=>`<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.length?rows.join(''):`<tr><td colspan="${heads.length}" class="empty">조회 결과가 없습니다.</td></tr>`}</tbody></table></div>`;
  const row=values=>`<tr>${values.map(v=>`<td>${v}</td>`).join('')}</tr>`;
  function notice(message,error=false) {$('#notice').hidden=false;$('#notice').className=error?'error':'';$('#notice').textContent=message;}
  function openModal(title,body,kind='') {
    if($('#modal').hidden)lastFocus=document.activeElement;
    $('#modal-title').textContent=title;$('#modal-body').innerHTML=body;$('#modal').hidden=false;modalKind=kind;
    $('#modal-close').focus();
  }
  function closeModal() {if(S.busy)return;$('#modal').hidden=true;lastFocus?.focus();}
  function form(title,content,submit,kind) {
    openModal(title,`<form id="editor"><div class="form-grid">${content}</div><div class="form-error" role="alert"></div><div class="actions">${button('close','취소')}<button type="submit" class="primary">${submit}</button></div></form>`,kind);
  }
  function setBusy(value) {S.busy=value;document.querySelectorAll('#modal button,#modal input,#modal select,#modal textarea,#reset,#reload').forEach(e=>e.disabled=value);}
  async function execute(command) {
    if(S.busy)throw new Error('저장 중입니다.');setBusy(true);
    try {
      const change=D.apply(S.data,command,$('#actor').value);
      const saved=await AssetStore.request('commit',{...change,expected:S.data.revision});
      S.data=saved;render();notice('저장했습니다. 변경 이력에서 처리 내용을 확인할 수 있습니다.');return saved;
    } catch(e) {notice('저장하지 못했습니다: '+e.message,true);throw e;}
    finally {setBusy(false);}
  }
  async function load() {
    try {
      const s=await AssetStore.request('init',{state:D.seed(),putFiles:D.seedFiles()});
      if(s.schema!==1)throw new Error('지원하지 않는 데이터 버전입니다.');D.validate(s);S.data=s;render();
    }catch(e){$('#storage-status').textContent='저장소 사용 불가';notice('저장소 연결 실패: '+e.message+' / 메모리 저장으로 대체하지 않습니다.',true);}
  }
  function processDescendants(id) {
    const ids=new Set([id]);let changed=true;
    while(changed){changed=false;for(const p of S.data.processes)if(ids.has(p.parentId)&&!ids.has(p.id)){ids.add(p.id);changed=true;}}
    return ids;
  }
  function tagDescendants(id) {
    const ids=new Set([id]);let changed=true;
    while(changed){changed=false;for(const t of S.data.tags)if(ids.has(t.parentId)&&!ids.has(t.id)){ids.add(t.id);changed=true;}}
    return ids;
  }
  function filteredAssets() {
    const s=S.data,q=S.search.toLowerCase();
    return s.assets.filter(a=>{
      const i=D.current(s,a.id),t=i&&find('tags',i.tagId),m=find('manufacturers',a.manufacturerId);
      if(S.scope==='spare' && (i||a.status!=='예비'))return false;
      if(S.scope.startsWith('process:') && (!t||!processDescendants(S.scope.slice(8)).has(t.processId)))return false;
      if(S.scope.startsWith('tag:') && (!t||!tagDescendants(S.scope.slice(4)).has(t.id)))return false;
      if(q&&![a.no,a.name,a.en,t?.no,m?.name].some(v=>(v||'').toLowerCase().includes(q)))return false;
      return (!S.location||(t&&processDescendants(S.location).has(t.processId)))&&(!S.classId||a.classId===S.classId)&&(!S.importance||a.importance===S.importance)&&(!S.status||a.status===S.status);
    }).sort((a,b)=>String(a[S.sort]||'').localeCompare(String(b[S.sort]||''),'ko'));
  }
  function render() {
    if(!S.data)return;
    $('#storage-status').textContent=(window.ASSET_STANDALONE_CLIENT?'단일 HTML':'Web')+' 저장소 연결 / 변경 '+S.data.revision;
    $('#asset-nav').innerHTML=Object.entries(menus).map(([k,v])=>button('menu',v,k,k===S.menu?'active':'')).join('');
    const s=S.data;
    $('#summary').innerHTML=[['전체 자산',s.assets.length],['가동 자산',s.assets.filter(a=>a.status==='가동').length],['빈 설비 태그',s.tags.filter(t=>t.active&&t.kind==='설비'&&!D.occupant(s,t.id)).length],['예비 자산',s.assets.filter(a=>a.status==='예비').length],['폐기 자산',s.assets.filter(a=>a.status==='폐기').length],['점검 기한 초과',s.plans.filter(overdue).length]].map(([k,v])=>`<div class="kpi"><span>${k}</span><strong>${v}</strong></div>`).join('');
    ({assets:renderAssets,maintenance:renderMaintenance,documents:renderDocuments,masters:renderMasters,changes:renderChanges})[S.menu]();
  }
  function renderAssets() {
    const s=S.data,all=filteredAssets(),pages=Math.max(1,Math.ceil(all.length/S.pageSize));S.page=Math.min(S.page,pages);
    function treeProcess(parent='',depth=0) {
      return s.processes.filter(p=>p.parentId===parent).map(p=>`${button('scope',p.name,'process:'+p.id,'process '+(S.scope==='process:'+p.id?'active':''))}<div style="padding-left:14px">${treeTags(p.id)}${treeProcess(p.id,depth+1)}</div>`).join('');
    }
    function treeTags(processId,parent='') {
      return s.tags.filter(t=>t.processId===processId&&t.parentId===parent).map(t=>`${button('scope',t.no+' '+(t.active?'':'[비활성] ')+(t.kind==='설비'?(D.occupant(s,t.id)?'설치':'빈 위치'):t.kind),'tag:'+t.id,'tag '+(S.scope==='tag:'+t.id?'active':''))}<div style="padding-left:10px">${treeTags(processId,t.id)}</div>`).join('');
    }
    const t=S.scope.startsWith('tag:')?find('tags',S.scope.slice(4)):null;
    $('#workspace').innerHTML=`<div class="layout"><aside class="card tree"><h3>시설과 태그 탐색</h3>${button('scope','전체 자산','',S.scope===''?'active':'')}${button('scope','예비 자산 (태그 없음)','spare',S.scope==='spare'?'active':'')}${treeProcess()}</aside><div class="card"><div class="toolbar"><h3 style="margin:0;margin-right:auto">자산대장 <small>${all.length}건</small></h3>${button('asset-new','자산 등록','','primary')}${button('import-open','엑셀 등록')}${button('export','목록 내보내기')}</div>${t?`<div class="tag-info"><strong>${esc(t.no)} / ${esc(t.name)}</strong> ${esc(t.kind)} / ${t.active?'활성':'비활성'}<br>도면 근거: ${esc(t.drawing)}<br>${t.kind!=='설비'?'밸브와 계측기는 태그 정보만 지원합니다.':D.occupant(s,t.id)?'현재 자산: '+esc(find('assets',D.occupant(s,t.id).assetId).no):'현재 설치된 자산이 없습니다.'}</div>`:''}<form id="filters" class="toolbar"><input name="search" aria-label="자산 검색" placeholder="자산번호, 태그번호, 명칭, 제조사 검색" value="${esc(S.search)}"><select name="location" aria-label="위치">${options(s.processes,S.location,'모든 위치')}</select><select name="classId" aria-label="설비 유형">${options(s.classes,S.classId,'모든 유형')}</select><select name="importance" aria-label="중요도">${options(['A','B','C'].map(v=>({id:v,name:v})),S.importance,'모든 중요도')}</select><select name="status" aria-label="운영 상태">${options(['가동','정지','예비','폐기'].map(v=>({id:v,name:v})),S.status,'모든 상태')}</select><select name="sort" aria-label="정렬">${['no','name','status','importance'].map((k,i)=>`<option value="${k}" ${S.sort===k?'selected':''}>${['자산번호순','명칭순','운영 상태순','중요도순'][i]}</option>`).join('')}</select><button type="submit">조회</button>${button('filter-clear','조건 초기화')}</form>${table(['자산번호 / 태그','자산명','설비 유형','제조사','위치','중요도','운영 상태','점검 상태','상세'],all.slice((S.page-1)*S.pageSize,S.page*S.pageSize).map(a=>{
      const i=D.current(s,a.id),t=i&&find('tags',i.tagId),plans=s.plans.filter(p=>p.active&&((p.targetType==='asset'&&p.targetId===a.id)||(p.targetType==='tag'&&p.targetId===t?.id)));
      return row([`${esc(a.no)}<br><small>${esc(t?.no||'태그 없음')}</small>`,esc(a.name),esc(find('classes',a.classId)?.name),esc(find('manufacturers',a.manufacturerId)?.name||'—'),esc(t?find('processes',t.processId)?.name:'미설치'),esc(a.importance),badge(a.status),plans.some(overdue)?'<span class="badge warn">기한 초과</span>':plans.length?'<span class="badge ok">예정</span>':'—',button('detail','상세',a.id)]);
    }))}<div class="pager">${button('page-prev','이전')}<span>${S.page} / ${pages} 페이지</span>${button('page-next','다음')}</div></div></div>`;
  }
  function assetForm(id='') {
    const a=id?find('assets',id):{status:'예비',importance:'B'};
    form(id?'자산 정보 수정':'신규 자산 등록',field('no','자산번호 *',a.no,'text',true)+field('name','자산명 *',a.name,'text',true)+field('en','영문 자산명 *',a.en,'text',true)+select('classId','설비 유형 *',activeOptions('classes',a.classId),a.classId)+simpleSelect('importance','중요도 *',['A','B','C'],a.importance)+simpleSelect('status','운영 상태 *',id?(a.status==='폐기'?['폐기']:D.current(S.data,id)?['가동','정지']:['예비']):['예비','가동','정지'],a.status)+select('manufacturerId','제조사',activeOptions('manufacturers',a.manufacturerId),a.manufacturerId,'제조사 없음')+field('model','모델명',a.model)+field('part','제조사 파트번호',a.part)+field('spec','규격과 사양',a.spec)+field('manufactured','제조일자',a.manufactured,'date')+field('acquired','취득일자',a.acquired,'date')+field('lifespan','내구연한 (년)',a.lifespan,'number')+select('managerId','관리 기관 / 부서 / 담당자',activeOptions('managers',a.managerId).map(m=>({...m,name:[m.name,m.department,m.person].filter(Boolean).join(' / ')})),a.managerId,'관리 기관 없음')+textArea('remark','비고',a.remark)+(!id?select('tagId','최초 설치 태그 (선택)',S.data.tags.filter(t=>t.active&&t.kind==='설비'&&!D.occupant(S.data,t.id)),'','예비로 등록')+field('date','최초 설치일자',D.today(),'date')+field('reason','설치 사유','최초 설치'):'')+`<div class="help">중요도 A: 공정 정지 또는 수질 이탈 / B: 성능 저하가 있으나 운전 지속 가능 / C: 단기 영향 없음<br>설치일자는 설치 기록에서 조회합니다. 상위 자산과 부속 자산은 향후 확장 항목입니다. 제조사 연락처와 관리 정보는 선택한 기준정보에서 조회합니다.</div>`,'저장',{type:'assetSave',id});
  }
  function lifecycleForm(type,id) {
    const a=find('assets',id);if(a.status==='폐기')throw new Error('폐기 자산은 처리할 수 없습니다.');
    let content=`<div class="help">대상: ${esc(a.no)} / ${esc(a.name)}. 처리 일자와 사유를 설치 이력에 남깁니다.</div>`;
    if(type==='install')content+=select('tagId','빈 설비 태그 *',S.data.tags.filter(t=>t.active&&t.kind==='설비'&&!D.occupant(S.data,t.id)));
    if(type==='replace')content+=select('newAssetId','신규 설치 자산 *',S.data.assets.filter(x=>x.status==='예비'&&!D.current(S.data,x.id)&&x.id!==id))+simpleSelect('oldStatus','기존 자산 처리',['예비','폐기'],'예비');
    if(['install','replace'].includes(type))content+=simpleSelect('status','설치 운영 상태',['가동','정지'],'가동');
    content+=field('date','처리 일자 *',D.today(),'date',true)+textArea('reason','사유 *');
    form('자산 '+kinds[type],content,'처리',{type,assetId:id});
  }
  function detail(id,tab='기본 정보') {
    detailId=id;detailTab=tab;const s=S.data,a=find('assets',id),i=D.current(s,id),t=i&&find('tags',i.tagId),m=find('manufacturers',a.manufacturerId),mgr=find('managers',a.managerId);
    let content='';
    if(tab==='기본 정보') {
      const pairs=[['자산번호',a.no],['태그번호',t?.no||'없음'],['자산명',a.name],['영문 자산명',a.en],['설비 유형',find('classes',a.classId)?.name],['영문 설비 유형',find('classes',a.classId)?.en],['중요도',a.importance],['운영 상태',a.status],['제조사',m?.name],['제조사 연락처',m?.contact],['모델명',a.model],['제조사 파트번호',a.part],['규격과 사양',a.spec],['제조일자',a.manufactured],['취득일자',a.acquired],['현재 설치일자',i?.start],['내구연한',a.lifespan],['관리 기관',mgr?.name],['관리 부서',mgr?.department],['담당자',mgr?.person],['담당자 연락처',mgr?.contact],['비고',a.remark],['폐기일자',a.disposed],['폐기 사유',a.disposalReason]];
      content='<div class="details">'+pairs.map(([k,v])=>`<div class="detail-value"><span>${k}</span>${esc(v||'—')}</div>`).join('')+'</div>';
    }
    if(tab==='문서')content=`<p class="section-note">자산 직접 연결, 현재 태그 연결, 소속 공정 연결을 구분합니다. 같은 원본 파일은 한 번만 표시합니다.</p>`+table(['문서','연결 경로','다운로드'],D.documentsFor(s,a).map(d=>row([esc(d.title)+'<br>'+esc(d.name),d.connections.map(l=>esc({asset:'자산 직접',tag:'현재 태그',process:'소속 공정'}[l.targetType])+' / '+esc(label(l.targetType,l.targetId))).join('<br>'),button('download','다운로드',d.id)])));
    if(tab==='설치와 교체')content=table(['태그','시작일','종료일','설치 사유','종료 사유'],s.installations.filter(x=>x.assetId===id).map(x=>row([esc(find('tags',x.tagId)?.no),esc(x.start),esc(x.end||'현재 설치'),esc(x.reason),esc(x.endReason||'—')])));
    if(tab==='점검과 정비') {
      const plans=s.plans.filter(p=>(p.targetType==='asset'&&p.targetId===id)||(p.targetType==='tag'&&p.targetId===t?.id));
      content=button('plan-asset','예비 자산 점검 계획 추가',id)+`<h3 style="margin-top:18px">현재 연결된 계획</h3>`+plansTable(plans)+`<h3 style="margin-top:18px">이 자산의 수행 기록</h3>`+recordsTable(s.records.filter(r=>r.assetId===id));
    }
    if(tab==='정보 변경 이력')content=changesTable(s.changes.filter(c=>[c.before?.assets,c.after?.assets].some(xs=>Array.isArray(xs)&&xs.some(x=>x.id===id))||[c.before?.records,c.after?.records,c.before?.installations,c.after?.installations].some(xs=>Array.isArray(xs)&&xs.some(x=>x.assetId===id))));
    openModal(a.no+' / '+a.name,`<div class="toolbar">${button('asset-edit','정보 수정',id)}${a.status!=='폐기'?(i?button('life-detach','해체',id)+button('life-replace','교체',id):button('life-install','설치',id))+button('life-dispose','폐기',id,'danger'):''}</div><div class="tabs">${['기본 정보','문서','설치와 교체','점검과 정비','정보 변경 이력'].map(k=>button('detail-tab',k,k,k===tab?'active':'')).join('')}</div>${content}`,'detail');
  }
  function plansTable(plans) {
    return table(['대상','항목','주기','예정일','점검 상태','처리'],plans.map(p=>row([button(p.targetType==='asset'?'detail':'plan-target',label(p.targetType,p.targetId),p.targetType==='asset'?p.targetId:p.id),esc(p.item),esc(p.months)+'개월',esc(p.due),planBadge(p),button('plan-edit','계획 수정',p.id)+(p.active?button('record-new','수행 기록',p.id):'')])));
  }
  function recordsTable(records) {
    return table(['수행일 / 종류','태그 / 당시 자산','항목','수행자','결과와 조치','수정'],records.slice().sort((a,b)=>b.date.localeCompare(a.date)).map(r=>row([esc(r.date)+'<br>'+esc(r.kind),esc(find('tags',r.tagId)?.no||'자산별')+'<br>'+button('detail',find('assets',r.assetId)?.no||'',r.assetId),esc(find('plans',r.planId)?.item),esc(r.performer),esc(r.result)+'<br>'+esc(r.action),button('record-edit','수정',r.id)])));
  }
  function renderMaintenance() {
    const q=S.planSearch.toLowerCase(),plans=S.data.plans.filter(p=>(!q||[p.item,label(p.targetType,p.targetId)].some(x=>x.toLowerCase().includes(q)))&&(!S.planFilter||(S.planFilter==='overdue'?overdue(p):p.active)));
    $('#workspace').innerHTML=`<div class="card"><div class="toolbar"><h3 style="margin-right:auto">점검 계획과 수행 기록</h3>${button('plan-new','점검 계획 추가','','primary')}</div><p class="section-note">태그별 계획은 교체 후에도 유지합니다. 수행 당시 자산을 별도로 기록하며 자산별 계획과 자동 병합하지 않습니다. 기본 주기는 달력 기준입니다.</p><form id="plan-filter" class="toolbar"><input name="planSearch" value="${esc(S.planSearch)}" placeholder="대상과 점검 항목 검색" aria-label="점검 검색"><select name="planFilter" aria-label="점검 상태"><option value="">전체 계획</option><option value="active" ${S.planFilter==='active'?'selected':''}>예정된 점검</option><option value="overdue" ${S.planFilter==='overdue'?'selected':''}>기한 초과</option></select><button>조회</button></form>${plansTable(plans)}<h3 style="margin-top:24px">전체 점검과 정비 이력</h3>${recordsTable(S.data.records.filter(r=>plans.some(p=>p.id===r.planId)))}</div>`;
  }
  function planForm(id='',assetId='') {
    const p=id?find('plans',id):{targetType:assetId?'asset':'tag',targetId:assetId,item:'',months:1,due:D.today(),active:true};
    const targets=[...S.data.tags.filter(t=>t.kind==='설비'&&(t.active||p.targetId===t.id)).map(t=>({...t,id:'tag:'+t.id,name:t.no+' / '+t.name,no:''})),...S.data.assets.filter(a=>a.status==='예비'||p.targetId===a.id).map(a=>({...a,id:'asset:'+a.id,name:a.no+' / '+a.name,no:''}))];
    form('점검 계획',select('target','계획 대상 *',targets,p.targetType+':'+p.targetId)+field('item','점검 항목 *',p.item,'text',true)+field('months','주기 (개월) *',p.months,'number',true)+field('due','예정일 *',p.due,'date',true)+simpleSelect('active','사용 여부',['활성','비활성'],p.active?'활성':'비활성')+'<div class="help">예비 자산에는 자산별 계획을 설정합니다. 수행 기록이 있는 계획은 대상 변경을 제한합니다.</div>','저장',{type:'planSave',id});
  }
  function recordForm(id='',planId='') {
    const r=id?find('records',id):{planId,date:D.today(),kind:'점검',performer:$('#actor').value,result:'정상',action:'이상 없음'};
    const p=find('plans',r.planId);
    form(id?'수행 기록 수정':'점검과 정비 수행 기록',`<div class="help">${esc(label(p.targetType,p.targetId))} / ${esc(p.item)}<br>수행 일자의 설치 이력에서 당시 자산을 기록합니다. 계획 대상과 기록의 자산 연결은 임의 변경하지 않습니다.</div>`+field('date','수행 일자 *',r.date,'date',true)+simpleSelect('kind','기록 종류',['점검','정비'],r.kind)+field('performer','수행자 *',r.performer,'text',true)+field('result','결과 *',r.result,'text',true)+textArea('action','조치 내용 *',r.action)+(!id?field('nextDue','다음 예정일 (확인 또는 조정) *',D.nextDate(r.date,p.months),'date',true):`<div class="help">이 기록에서 확인한 다음 예정일: ${esc(r.nextDue||'—')}. 기록 수정은 현재 계획 예정일을 덮어쓰지 않습니다.</div>`),'저장',{type:'recordSave',id,planId:r.planId});
  }
  function renderDocuments() {
    const q=S.docSearch.toLowerCase(),ds=S.data.documents.filter(d=>[d.title,d.name,d.category,d.description,...S.data.links.filter(l=>l.documentId===d.id).map(l=>label(l.targetType,l.targetId))].some(x=>(x||'').toLowerCase().includes(q)));
    $('#workspace').innerHTML=`<div class="card"><div class="toolbar"><h3 style="margin-right:auto">도면과 문서</h3>${button('document-new','파일 등록','','primary')}</div><p class="section-note">파일을 등록한 뒤 여러 자산, 태그와 공정에 연결합니다. 내장 미리보기는 제공하지 않으며 모든 파일은 다운로드합니다.</p><form id="doc-filter" class="toolbar"><input name="docSearch" value="${esc(S.docSearch)}" placeholder="문서명, 분류 또는 연결 대상 검색" aria-label="문서 검색"><button>조회</button></form>${table(['파일과 제목','분류 / 개정','연결 대상','처리'],ds.map(d=>row([`<div class="doc-name"><strong>${esc(d.title)}</strong><br>${esc(d.name)}<br><small>${esc(d.description)} / ${Math.ceil(d.size/1024)} KB</small></div>`,esc(d.category)+'<br>'+esc(d.revision),S.data.links.filter(l=>l.documentId===d.id).map(l=>`${esc(label(l.targetType,l.targetId))} ${button('link-remove','연결 해제',l.id)}`).join('<br>')||'연결 없음',button('download','다운로드',d.id)+button('link-new','대상 연결',d.id)+button('document-remove','파일 제거',d.id,'danger')])))}</div>`;
  }
  function targetOptions() {return ['asset','tag','process'].flatMap(type=>S.data[{asset:'assets',tag:'tags',process:'processes'}[type]].map(x=>({id:type+':'+x.id,name:({asset:'자산',tag:'태그',process:'공정'}[type])+' / '+label(type,x.id)})));}
  function documentForm() {form('문서 원본 등록',field('title','문서 제목 *','','text',true)+simpleSelect('category','분류',['도면','매뉴얼','성적서','기타'],'도면')+field('revision','개정 번호')+'<label>첨부파일 *<input type="file" name="file" required></label>'+select('target','최초 연결 대상 (선택)',targetOptions(),'','연결 없이 등록')+textArea('description','설명'),'등록',{type:'documentAdd'});}
  function renderMasters() {
    $('#workspace').innerHTML=`<div class="card"><h3>기준정보와 태그 계층</h3><p class="section-note">사용 중인 기준정보는 삭제 대신 비활성화합니다. 기존 자산의 참조와 명칭을 유지하며 신규 선택에서는 제외합니다.</p>${['classes','manufacturers','managers','tags'].map(list=>{
      const titles={classes:'설비 분류',manufacturers:'제조사',managers:'관리 기관',tags:'태그 계층'};
      return `<section class="master-block"><div class="master-heading"><h3>${titles[list]}</h3>${button('master-new','추가',list)}</div>${table(['코드 / 태그번호','명칭','추가 정보','사용 여부','처리'],S.data[list].map(x=>row([esc(x.no||x.id),esc(x.name),list==='tags'?esc(find('processes',x.processId)?.name)+' / '+esc(x.kind)+'<br>상위: '+esc(find('tags',x.parentId)?.no||'없음')+'<br>'+esc(x.drawing):list==='managers'?esc([x.department,x.person,x.contact].filter(Boolean).join(' / ')):list==='manufacturers'?esc(x.contact||'—'):esc(x.en),x.active?'활성':'비활성',button('master-edit','수정',list+':'+x.id)+(list==='tags'?'':button('master-remove','삭제 또는 비활성화',list+':'+x.id,'danger'))])))}</section>`;
    }).join('')}</div>`;
  }
  function masterForm(list,id='') {
    const x=id?find(list,id):{active:true,kind:'설비'};let content='';
    if(list==='tags')content=field('no','태그번호 *',x.no,'text',true)+field('name','태그 명칭 *',x.name,'text',true)+simpleSelect('kind','태그 종류',['설비','밸브','계측기'],x.kind)+select('processId','소속 공정 *',S.data.processes,x.processId)+select('parentId','상위 태그',S.data.tags.filter(t=>t.id!==id&&(t.active||t.id===x.parentId)),x.parentId,'상위 태그 없음')+field('drawing','도면 근거 *',x.drawing,'text',true);
    else {
      content=field('code','코드 (신규 시 선택, 없으면 자동 생성)',x.id)+field('name','명칭 *',x.name,'text',true);
      const fields={classes:[['en','영문 유형 *']],manufacturers:[['en','영문명'],['contact','대표 연락처'],['email','이메일'],['url','홈페이지'],['address','주소']],managers:[['department','관리 부서'],['person','담당자'],['contact','담당자 연락처']]};
      content+=fields[list].map(([k,h])=>field(k,h,x[k],'text',list==='classes')).join('');content+=textArea('remark','비고',x.remark);
    }
    content+=simpleSelect('active','사용 여부',['활성','비활성'],x.active?'활성':'비활성');
    form(list==='tags'?'태그 계층 관리':'기준정보 관리',content,'저장',{type:list==='tags'?'tagSave':'masterSave',list,id});
    if(id&&list!=='tags')$('#editor [name="code"]').readOnly=true;
  }
  function changesTable(changes) {
    return table(['시각','종류','대상','입력 작업자','상세'],changes.slice().reverse().map(c=>row([esc(new Date(c.time).toLocaleString('ko-KR')),esc(kinds[c.kind]||c.kind),esc(c.target),esc(c.actor),button('change-detail','변경 전후 값',c.id)])));
  }
  function renderChanges() {
    const q=S.changeSearch.toLowerCase(),changes=S.data.changes.filter(c=>(!q||(c.target+' '+JSON.stringify(c.before)+' '+JSON.stringify(c.after)).toLowerCase().includes(q))&&(!S.changeKind||c.kind===S.changeKind)&&(!S.from||c.time>=new Date(S.from+'T00:00:00').toISOString())&&(!S.to||c.time<=new Date(S.to+'T23:59:59.999').toISOString()));
    $('#workspace').innerHTML=`<div class="card"><h3>정보 변경 이력</h3><p class="section-note">작업자가 입력한 이름과 처리 시각을 남깁니다. 인증된 사용자 감사 기록이 아닙니다. 실제 정비 수행 이력은 점검과 정비에서 조회합니다.</p><form id="change-filter" class="toolbar"><input name="changeSearch" value="${esc(S.changeSearch)}" placeholder="대상 또는 변경 값 검색" aria-label="변경 대상 검색"><select name="changeKind" aria-label="변경 종류">${options([...new Set(S.data.changes.map(c=>c.kind))].map(k=>({id:k,name:kinds[k]||k})),S.changeKind,'모든 변경 종류')}</select><input type="date" name="from" value="${S.from}" aria-label="시작일"><input type="date" name="to" value="${S.to}" aria-label="종료일"><button>조회</button></form>${changesTable(changes)}</div>`;
  }
  function changeDetail(id) {
    const c=find('changes',id);
    openModal('변경 전후 값',`<p>${esc(c.target)} / ${esc(c.actor)} / ${esc(new Date(c.time).toLocaleString('ko-KR'))}</p><div class="details" style="margin-top:16px"><div><h3>변경 전</h3><pre class="change-values">${esc(JSON.stringify(c.before,null,2))}</pre></div><div><h3>변경 후</h3><pre class="change-values">${esc(JSON.stringify(c.after,null,2))}</pre></div></div>`);
  }
  function downloadBlob(blob,name) {
    const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
  }
  async function download(id) {const d=find('documents',id),blob=await AssetStore.request('file',{id});if(!blob)throw new Error('파일 원본을 찾을 수 없습니다.');downloadBlob(blob,d.name);}
  function workbook(rows,sheet='자산대장') {const w=XLSX.utils.book_new();XLSX.utils.book_append_sheet(w,XLSX.utils.json_to_sheet(rows),sheet);return w;}
  function saveXlsx(w,name) {downloadBlob(new Blob([XLSX.write(w,{bookType:'xlsx',type:'array'})],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}),name);}
  function exportAssets() {
    const rows=filteredAssets().map(a=>{const r={};for(const [k,h] of Object.entries(D.columns))r[h]=a[k]??'';const i=D.current(S.data,a.id);r['태그번호']=i?find('tags',i.tagId).no:'';r['설치일자']=i?.start||'';r['영문 설비 유형']=find('classes',a.classId)?.en||'';r['제조사 연락처']=find('manufacturers',a.manufacturerId)?.contact||'';r['관리 부서']=find('managers',a.managerId)?.department||'';r['담당자']=find('managers',a.managerId)?.person||'';r['담당자 연락처']=find('managers',a.managerId)?.contact||'';return r;});
    const w=workbook(rows);if(!rows.length)w.Sheets['자산대장']=XLSX.utils.aoa_to_sheet([Object.values(D.columns).concat(['태그번호','설치일자'])]);
    saveXlsx(w,'자산대장_검색결과.xlsx');notice('검색과 필터에 맞는 전체 '+rows.length+'건을 내보냈습니다.');
  }
  function template() {
    const sample={};for(const h of Object.values(D.columns))sample[h]='';Object.assign(sample,{'자산번호':'NEW001','자산명':'신규 예비 펌프','영문 자산명':'New Spare Pump','설비 유형 코드':S.data.classes.find(x=>x.active)?.id||'','중요도':'B','운영 상태':'예비','태그번호':'','설치일자':''});
    const w=workbook([sample]);
    XLSX.utils.book_append_sheet(w,XLSX.utils.aoa_to_sheet([['안내','값'],['등록','신규 자산만 등록합니다. 예시 행을 수정 또는 삭제하십시오.'],['필수','자산번호, 자산명, 영문 자산명, 설비 유형 코드, 중요도, 운영 상태'],['태그','설비 태그만 지원. 설치일자는 YYYY-MM-DD, 상태는 가동 또는 정지'],['예비','태그번호와 설치일자는 비워 두고 상태를 예비로 입력'],['날짜','모든 날짜는 YYYY-MM-DD 텍스트'],['상위 자산','부속 자산은 미지원. 상위 자산 입력 시 오류'],['내보내기','기존 자산 일괄 수정은 지원하지 않습니다.']]),'입력 안내');
    for(const list of ['classes','manufacturers','managers','tags'])XLSX.utils.book_append_sheet(w,XLSX.utils.json_to_sheet(S.data[list].filter(x=>x.active).map(x=>({코드:x.id,명칭:x.name,태그번호:x.no||'',종류:x.kind||''})) ),{classes:'설비 유형 코드',manufacturers:'제조사 코드',managers:'관리 기관 코드',tags:'태그 안내'}[list]);
    saveXlsx(w,'자산_신규등록_양식.xlsx');
  }
  function importModal() {
    importRows=[];openModal('엑셀 신규 자산 사전 검토',`<p class="section-note">.xlsx의 자산대장 시트를 검토합니다. 모든 행이 정상일 때만 일괄 저장하며 기존 자산은 수정하지 않습니다.</p><div class="toolbar">${button('template','양식 다운로드')}<label>엑셀 파일 <input id="import-file" type="file" accept=".xlsx"></label></div><div id="import-review" class="preview">양식을 내려받아 입력한 후 파일을 선택하십시오.</div><div class="actions"><button id="import-commit" type="button" data-action="import-commit" class="primary" disabled>검토한 전체 행 등록</button></div>`,'import');
  }
  function renderReview() {
    const review=D.reviewImport(S.data,importRows);
    $('#import-review').innerHTML=`<p>전체 ${importRows.length}행 / 정상 ${review.entries.length}행 / 오류 ${review.errors.length}건</p>`+(review.errors.length?table(['엑셀 행','항목','오류 사유'],review.errors.map(e=>row([e.row,esc(e.field||'입력 자료'),esc(e.message)]))):table(['자산번호','자산명','설치 태그'],review.entries.map(e=>row([esc(e.asset.no),esc(e.asset.name),esc(e.tagId?find('tags',e.tagId)?.no:'예비')]))));
    $('#import-commit').disabled=!!review.errors.length||!importRows.length;
  }
  document.addEventListener('submit',async e=>{
    const f=e.target;e.preventDefault();const v=Object.fromEntries(new FormData(f));
    if(['filters','plan-filter','doc-filter','change-filter'].includes(f.id)){Object.assign(S,v);S.page=1;render();return;}
    if(f.id!=='editor')return;
    const k=modalKind;let c;
    try {
      if(k.type==='assetSave'){const {tagId,date,reason,...value}=v;c={type:k.type,value:{...value,id:k.id},tagId,date,reason};}
      else if(['install','detach','replace','dispose'].includes(k.type))c={...k,...v};
      else if(k.type==='tagSave')c={type:k.type,value:{...v,id:k.id,active:v.active==='활성'}};
      else if(k.type==='masterSave'){const {code,...value}=v;c={type:k.type,list:k.list,create:!k.id,value:{...value,id:k.id||code.trim(),active:v.active==='활성'}};}
      else if(k.type==='planSave'){const [targetType,targetId]=v.target.split(':');c={type:k.type,value:{id:k.id,targetType,targetId,item:v.item,months:v.months,due:v.due,active:v.active==='활성'}};}
      else if(k.type==='recordSave')c={type:k.type,value:{...v,id:k.id,planId:k.planId}};
      else if(k.type==='documentAdd'){const {file,target,...value}=v;const [targetType,targetId]=target.split(':');c={type:k.type,value:{...value,name:file.name},file,links:target?[{targetType,targetId}]:[]};}
      else if(k.type==='linkAdd'){const [targetType,targetId]=v.target.split(':');c={type:k.type,documentId:k.documentId,targetType,targetId};}
      await execute(c);closeModal();
    }catch(err){const el=$('#editor .form-error');if(el)el.textContent=err.message;}
  });
  document.addEventListener('change',async e=>{
    if(e.target.id==='import-file') {
      try {
        const file=e.target.files[0];if(!file)return;if(!file.name.toLowerCase().endsWith('.xlsx'))throw new Error('.xlsx 파일만 선택하십시오.');
        if(file.size>20*1024*1024)throw new Error('엑셀 파일은 20 MB 이하로 선택하십시오.');
        const data=await file.arrayBuffer(),signature=new Uint8Array(data);
        if(signature[0]!==0x50||signature[1]!==0x4b)throw new Error('정상적인 .xlsx 통합 문서가 아닙니다.');
        const w=XLSX.read(data,{type:'array',cellDates:true});if(!w.Sheets['자산대장'])throw new Error('자산대장 시트가 없습니다. 양식을 사용하십시오.');
        const sheet=w.Sheets['자산대장'],range=XLSX.utils.decode_range(sheet['!ref']||'A1');
        if(range.e.r>10000)throw new Error('한 번에 10,000행 이하를 검토하십시오.');
        importRows=XLSX.utils.sheet_to_json(sheet,{defval:'',raw:true}).map(r=>Object.fromEntries(Object.entries(r).map(([k,v])=>[k,v instanceof Date?v.toISOString().slice(0,10):v])));
        renderReview();
      }catch(err){importRows=[];$('#import-review').textContent=err.message;$('#import-commit').disabled=true;}
    }
    if(e.target.name==='date' && modalKind?.type==='recordSave'&&!modalKind.id){const p=find('plans',modalKind.planId);try{$('#editor [name="nextDue"]').value=D.nextDate(e.target.value,p.months);}catch{}}
  });
  document.addEventListener('click',async e=>{
    const b=e.target.closest('[data-action]');if(!b||S.busy||!S.data)return;
    const id=b.dataset.id,action=b.dataset.action;
    try {
      if(action==='menu'){S.menu=id;render();}
      if(action==='scope'){S.scope=id;S.page=1;render();}
      if(action==='filter-clear'){Object.assign(S,{scope:'',search:'',location:'',classId:'',importance:'',status:'',sort:'no',page:1});render();}
      if(action==='page-prev'){S.page=Math.max(1,S.page-1);render();}
      if(action==='page-next'){S.page++;render();}
      if(action==='asset-new')assetForm();if(action==='asset-edit')assetForm(id);
      if(action==='detail')detail(id);if(action==='detail-tab')detail(detailId,id);
      if(action.startsWith('life-'))lifecycleForm(action.slice(5),id);
      if(action==='plan-new')planForm();if(action==='plan-asset')planForm('',id);if(action==='plan-edit')planForm(id);
      if(action==='record-new')recordForm('',id);if(action==='record-edit')recordForm(id);
      if(action==='plan-target'){const p=find('plans',id),i=D.occupant(S.data,p.targetId);if(i)detail(i.assetId,'점검과 정비');else{closeModal();S.menu='assets';S.scope='tag:'+p.targetId;render();}}
      if(action==='document-new')documentForm();if(action==='download')await download(id);
      if(action==='link-new')form('문서 대상 연결',select('target','연결 대상 *',targetOptions()),'연결',{type:'linkAdd',documentId:id});
      if(action==='link-remove')await execute({type:'linkRemove',id});
      if(action==='document-remove'&&confirm('연결이 없는 파일 원본을 제거하시겠습니까?'))await execute({type:'documentRemove',id});
      if(action==='master-new')masterForm(id);
      if(action==='master-edit'){const [list,key]=id.split(':');masterForm(list,key);}
      if(action==='master-remove'&&confirm('사용 중이면 비활성화하고, 참조가 없으면 삭제합니다. 진행하시겠습니까?')){const [list,key]=id.split(':');await execute({type:'masterRemove',list,id:key});}
      if(action==='change-detail')changeDetail(id);
      if(action==='export')exportAssets();if(action==='template')template();if(action==='import-open')importModal();
      if(action==='import-commit'){await execute({type:'import',rows:importRows});closeModal();}
      if(action==='close')closeModal();
    }catch(err){notice(err.message,true);}
  });
  $('#modal-close').onclick=closeModal;
  document.addEventListener('keydown',e=>{
    if($('#modal').hidden)return;if(e.key==='Escape')closeModal();
    if(e.key==='Tab'){const es=[...$('#modal').querySelectorAll('button,input,select,textarea,a')].filter(el=>!el.disabled&&el.offsetParent!==null);if(!es.length)return;const first=es[0],last=es.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}
  });
  $('#reload').onclick=async()=>{if(S.busy)return;closeModal();await load();};
  $('#reset').onclick=async()=>{
    if(S.busy||!confirm('이 브라우저의 자산 관리 시제품 데이터와 첨부파일을 예시 상태로 초기화하시겠습니까? 다른 메뉴의 저장소는 유지됩니다.'))return;
    try{setBusy(true);const actor=$('#actor').value.trim();if(!actor)throw new Error('작업자명을 입력하십시오.');const s=D.seed();s.changes.push({id:D.uid(),time:new Date().toISOString(),kind:'reset',target:'자산 관리 시제품',actor,before:{},after:{exampleData:true}});S.data=await AssetStore.request('reset',{state:s,putFiles:D.seedFiles()});render();notice('자산 관리 시제품만 초기화했습니다.');}catch(e){notice('초기화 실패: '+e.message,true);}finally{setBusy(false);}
  };
  window.AssetApp={get state(){return structuredClone(S.data);},get ready(){return !!S.data;},execute,filteredAssets};
  load();
})();
