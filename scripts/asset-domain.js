/* 화면과 저장소에 독립적인 자산 관리 업무 규칙 */
(function (root) {
  'use strict';
  const uid = () => 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
  const today = () => { const d = new Date(); return [d.getFullYear(), String(d.getMonth()+1).padStart(2,'0'), String(d.getDate()).padStart(2,'0')].join('-'); };
  const fail = msg => { throw new Error(msg); };
  const need = (v, label) => { if (!String(v ?? '').trim()) fail(label + '을(를) 입력하십시오.'); };
  const date = (v, label, required = true) => {
    if (!v && !required) return;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v || '') || !Number.isFinite(Date.parse(v)) || new Date(v + 'T00:00:00Z').toISOString().slice(0,10) !== v) fail(label + '은(는) 유효한 YYYY-MM-DD 날짜여야 합니다.');
  };
  const get = (s, list, id) => s[list].find(x => x.id === id) || fail('존재하지 않는 참조: ' + list);
  const current = (s, assetId) => s.installations.find(x => x.assetId === assetId && !x.end);
  const occupant = (s, tagId) => s.installations.find(x => x.tagId === tagId && !x.end);
  const installedAt = (s, tagId, when) => s.installations.find(x => x.tagId === tagId && x.start <= when && (!x.end || when < x.end));
  function nextDate(value, months) {
    date(value, '수행 일자');
    const d = new Date(value + 'T12:00:00Z'), day = d.getUTCDate();
    d.setUTCDate(1); d.setUTCMonth(d.getUTCMonth() + Number(months));
    const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth()+1, 0)).getUTCDate();
    d.setUTCDate(Math.min(day, last)); return d.toISOString().slice(0,10);
  }
  function seed() {
    const a = (id, no, name, en, status, classId = 'CL01') => ({ id, no, name, en, status, classId, importance:'A', manufacturerId:'MF01', managerId:'MG01', model:'DEMO-100', part:'', spec:'시제품 예시 사양', manufactured:'2026-03-01', acquired:'2026-06-01', lifespan:15, remark:'가상 예시 자산' });
    return {
      schema:1, revision:0,
      processes:[{id:'PL01',name:'해수담수화 예시 시설',parentId:''},{id:'PR01',name:'취수와 전처리',parentId:'PL01'},{id:'PR02',name:'SWRO 공정',parentId:'PL01'},{id:'PR03',name:'생산수 저장',parentId:'PL01'}],
      tags:[{id:'T01',no:'P-101',name:'취수 펌프 위치',kind:'설비',processId:'PR01',parentId:'',drawing:'DEMO-PID-001 Rev.A',active:true},{id:'T02',no:'P-202',name:'SWRO 고압펌프 위치',kind:'설비',processId:'PR02',parentId:'',drawing:'DEMO-PID-002 Rev.B',active:true},{id:'T03',no:'P-203',name:'빈 펌프 위치',kind:'설비',processId:'PR02',parentId:'',drawing:'DEMO-PID-002 Rev.B',active:true},{id:'T04',no:'V-201',name:'입구 차단 밸브',kind:'밸브',processId:'PR02',parentId:'T02',drawing:'DEMO-PID-002 Rev.B',active:true},{id:'T05',no:'PT-201',name:'토출 압력 계측기',kind:'계측기',processId:'PR02',parentId:'T02',drawing:'DEMO-PID-002 Rev.B',active:true},{id:'T06',no:'TK-301',name:'생산수 탱크 위치',kind:'설비',processId:'PR03',parentId:'',drawing:'DEMO-PID-003 Rev.A',active:true}],
      classes:[{id:'CL01',name:'펌프',en:'Pump',active:true},{id:'CL02',name:'탱크',en:'Tank',active:true}],
      manufacturers:[{id:'MF01',name:'예시 펌프 제조사',en:'Demo Pumps',contact:'000-0000-0000',email:'demo@example.invalid',url:'',address:'가상 주소',remark:'가상 정보',active:true}],
      managers:[{id:'MG01',name:'예시 운영기관',department:'운영팀',person:'예시 담당자',contact:'000-0000-0000',remark:'가상 정보',active:true}],
      assets:[a('A1','A00001','취수 펌프','Intake Pump','가동'),a('A2','A00002','SWRO 고압펌프','SWRO High Pressure Pump','가동'),a('A3','A00003','예비 고압펌프','Spare High Pressure Pump','예비'),a('A4','A00004','이전 고압펌프','Previous Pump','예비'),a('A5','A00005','폐기 펌프','Retired Pump','폐기'),a('A6','A00006','생산수 탱크','Product Water Tank','정지','CL02')].map(x => x.id === 'A5' ? {...x,disposed:'2026-08-01',disposalReason:'노후 예시'} : x),
      installations:[{id:'I1',assetId:'A1',tagId:'T01',start:'2026-07-01',end:'',reason:'최초 설치'},{id:'I2',assetId:'A4',tagId:'T02',start:'2026-06-01',end:'2026-08-01',reason:'최초 설치',endReason:'성능 저하로 교체'},{id:'I3',assetId:'A2',tagId:'T02',start:'2026-08-01',end:'',reason:'성능 저하로 교체'},{id:'I4',assetId:'A6',tagId:'T06',start:'2026-07-01',end:'',reason:'최초 설치'},{id:'I5',assetId:'A5',tagId:'T03',start:'2026-06-01',end:'2026-08-01',reason:'최초 설치',endReason:'노후 예시'}],
      plans:[{id:'PLAN1',targetType:'tag',targetId:'T02',item:'진동과 누수 점검',months:1,due:'2026-09-01',active:true},{id:'PLAN2',targetType:'asset',targetId:'A3',item:'예비 펌프 보관 상태',months:3,due:'2026-10-15',active:true}],
      records:[{id:'REC1',planId:'PLAN1',tagId:'T02',assetId:'A4',date:'2026-07-15',performer:'예시 작업자',result:'조치 필요',action:'씰 점검 후 교체 검토',kind:'점검',nextDue:'2026-08-15'}],
      documents:[{id:'DOC1',name:'예시 공통 P&ID 안내.txt',title:'SWRO 예시 도면 안내',category:'도면',revision:'Rev.B',description:'실제 도면 대신 제공한 예시 텍스트 파일',size:seedFiles()[0].blob.size,type:'text/plain'}],
      links:[{id:'L1',documentId:'DOC1',targetType:'tag',targetId:'T02'},{id:'L2',documentId:'DOC1',targetType:'process',targetId:'PR02'}],
      changes:[{id:'C1',time:'2026-08-01T00:00:00.000Z',actor:'예시 작업자',kind:'교체',target:'P-202',before:{asset:'A00004'},after:{asset:'A00002',date:'2026-08-01',reason:'성능 저하로 교체'}}]
    };
  }
  function seedFiles() { return [{id:'DOC1',blob:new Blob(['PROMISE DT 예시 문서\n공통 P&ID 연결 흐름 확인용입니다. 실제 설계 도면이 아닙니다.\n'],{type:'text/plain;charset=utf-8'})}]; }
  function ref(s, list, id, previous) {
    if (!id) return;
    const r = s[list].find(x=>x.id===id);
    if(!r)fail('존재하지 않는 '+({classes:'설비 유형',manufacturers:'제조사',managers:'관리 기관'}[list])+' 코드: '+id);
    if (!r.active && id !== previous) fail('비활성 기준정보는 새로 선택할 수 없습니다: ' + r.name);
  }
  function assetValidate(s, a, old) {
    for (const [key,label] of [['no','자산번호'],['name','자산명'],['en','영문 자산명'],['classId','설비 유형'],['importance','중요도'],['status','운영 상태']]) need(a[key],label);
    if (s.assets.some(x=>x.id!==a.id && x.no.toLowerCase()===a.no.toLowerCase())) fail('중복 자산번호: '+a.no);
    if (!['A','B','C'].includes(a.importance)) fail('중요도는 A, B, C를 사용하십시오.');
    if (!['가동','정지','예비','폐기'].includes(a.status)) fail('운영 상태 코드가 올바르지 않습니다.');
    for (const [list,key] of [['classes','classId'],['manufacturers','manufacturerId'],['managers','managerId']]) ref(s,list,a[key],old?.[key]);
    date(a.manufactured,'제조일자',false); date(a.acquired,'취득일자',false);
    if (a.manufactured && a.acquired && a.manufactured>a.acquired) fail('취득일자는 제조일자보다 빠를 수 없습니다.');
    if (a.acquired && (s.installations.some(i=>i.assetId===a.id&&i.start<a.acquired) || s.records.some(r=>r.assetId===a.id&&r.date<a.acquired) || (a.disposed&&a.disposed<a.acquired))) fail('취득일자가 기존 설치와 수행 또는 폐기 기록보다 뒤입니다.');
    if (a.lifespan !== '' && a.lifespan != null && (!Number.isInteger(Number(a.lifespan)) || Number(a.lifespan)<0)) fail('내구연한은 0 이상의 정수입니다.');
    if (old && ((old.status==='폐기') !== (a.status==='폐기') || (!!current(s,old.id) && a.status==='예비') || (!current(s,old.id) && ['가동','정지'].includes(a.status)))) fail('상태 전환은 설치, 해체 또는 폐기 기능을 사용하십시오.');
  }
  function lifecycleDate(s,a,when) {
    date(when,'처리 일자'); if (when>today()) fail('설치와 해체 및 폐기는 미래 일자로 처리할 수 없습니다.');
    if (a.acquired && when<a.acquired) fail('처리 일자는 취득일자보다 빠를 수 없습니다.');
  }
  function install(s,assetId,tagId,when,reason,status='가동') {
    const a=get(s,'assets',assetId), t=get(s,'tags',tagId);
    lifecycleDate(s,a,when); need(reason,'사유');
    if (a.status==='폐기') fail('폐기 자산은 재설치할 수 없습니다.');
    if (!t.active || t.kind!=='설비') fail('활성 설비 태그에만 설치할 수 있습니다.');
    if (current(s,assetId) || occupant(s,tagId)) fail('자산 또는 태그가 이미 설치되어 있습니다.');
    if (s.installations.some(i=>(i.assetId===assetId || i.tagId===tagId) && (!i.end || i.end>when))) fail('기존 설치 기간과 겹칩니다.');
    if (!['가동','정지'].includes(status)) fail('설치 운영 상태는 가동 또는 정지입니다.');
    a.status=status; s.installations.push({id:uid(),assetId,tagId,start:when,end:'',reason});
  }
  function end(s,assetId,when,reason,status) {
    const a=get(s,'assets',assetId); lifecycleDate(s,a,when); need(reason,'사유');
    const i=current(s,assetId);
    if (i && when<=i.start) fail('종료일은 설치 시작일보다 뒤여야 합니다.');
    if (s.records.some(r=>r.assetId===assetId && r.date>=when && r.tagId)) fail('종료일 이후 수행 기록이 존재합니다. 기록을 확인하십시오.');
    if (i) {i.end=when;i.endReason=reason;}
    a.status=status;
    if (status==='폐기') {a.disposed=when;a.disposalReason=reason;}
  }
  function validate(s) {
    const usedA=new Set(),usedT=new Set();
    const periods=new Map();
    for(const i of s.installations) {
      get(s,'assets',i.assetId);get(s,'tags',i.tagId);date(i.start,'설치 시작일');
      if (i.end) {date(i.end,'종료일');if(i.end<=i.start) fail('설치 기간 역전');}
      else {if(usedA.has(i.assetId)||usedT.has(i.tagId))fail('중복 설치');usedA.add(i.assetId);usedT.add(i.tagId);}
      for(const key of ['asset:'+i.assetId,'tag:'+i.tagId]) {if(!periods.has(key))periods.set(key,[]);periods.get(key).push(i);}
    }
    for(const values of periods.values()) {
      values.sort((a,b)=>a.start.localeCompare(b.start));
      for(let i=1;i<values.length;i++)if(!values[i-1].end || values[i-1].end>values[i].start)fail('설치 기간이 중복됩니다.');
    }
    for (const a of s.assets) if (usedA.has(a.id) !== ['가동','정지'].includes(a.status)) fail('설치 관계와 운영 상태가 일치하지 않습니다.');
    for (const t of s.tags) {
      get(s,'processes',t.processId);
      const seen=new Set([t.id]);let p=t.parentId;
      while(p) {if(seen.has(p))fail('태그 계층 순환은 허용되지 않습니다.');seen.add(p);const x=get(s,'tags',p);if(x.processId!==t.processId)fail('상위 태그는 같은 공정이어야 합니다.');p=x.parentId;}
    }
    return s;
  }
  function target(s,type,id) { return get(s,{asset:'assets',tag:'tags',process:'processes'}[type] || fail('대상 종류 오류'),id); }
  function apply(state, command, actor) {
    need(actor,'작업자명');
    const s=structuredClone(state), c=command, before=structuredClone(state);
    let label='',kind=c.type, putFiles=[],deleteFiles=[];
    if(c.type==='assetSave') {
      const old=c.value.id ? get(s,'assets',c.value.id) : null;
      const a={...c.value,id:old?.id || uid()};assetValidate(s,a,old);label=a.no;
      if(old) Object.assign(old,a); else {
        if(a.status==='폐기')fail('신규 자산은 예비로 등록 후 폐기 처리하십시오.');
        const desired=a.status;a.status='예비';s.assets.push(a);
        if(c.tagId)install(s,a.id,c.tagId,c.date,c.reason,desired==='정지'?'정지':'가동');
        else if(desired!=='예비')fail('태그 없는 신규 자산의 운영 상태는 예비여야 합니다.');
      }
    } else if(['install','detach','replace','dispose'].includes(c.type)) {
      const a=get(s,'assets',c.assetId);label=a.no;
      if(c.type==='install') install(s,a.id,c.tagId,c.date,c.reason,c.status);
      if(c.type==='detach') {if(!current(s,a.id))fail('설치된 자산만 해체할 수 있습니다.');end(s,a.id,c.date,c.reason,'예비');}
      if(c.type==='dispose') {if(a.status==='폐기')fail('이미 폐기된 자산입니다.');end(s,a.id,c.date,c.reason,'폐기');}
      if(c.type==='replace') {
        const i=current(s,a.id);if(!i)fail('설치된 자산만 교체할 수 있습니다.');
        if(!['예비','폐기'].includes(c.oldStatus))fail('기존 자산은 예비 또는 폐기로 처리하십시오.');
        const tagId=i.tagId;end(s,a.id,c.date,c.reason,c.oldStatus);install(s,c.newAssetId,tagId,c.date,c.reason,c.status);
      }
    } else if(c.type==='tagSave') {
      const old=c.value.id ? get(s,'tags',c.value.id) : null;
      const t={...c.value,id:old?.id || uid()};need(t.no,'태그번호');need(t.name,'태그 명칭');need(t.drawing,'도면 근거');
      if(!['설비','밸브','계측기'].includes(t.kind))fail('태그 종류 오류');
      if(s.tags.some(x=>x.id!==t.id&&x.no.toLowerCase()===t.no.toLowerCase()))fail('중복 태그번호');
      if(occupant(s,t.id)&&(!t.active || t.kind!=='설비'))fail('설치 자산을 먼저 해체하거나 교체하십시오.');
      if(t.parentId && !get(s,'tags',t.parentId).active && t.parentId!==old?.parentId)fail('비활성 상위 태그를 새로 선택할 수 없습니다.');
      if(old)Object.assign(old,t);else s.tags.push(t);label=t.no;
    } else if(c.type==='masterSave' || c.type==='masterRemove') {
      if(!['classes','manufacturers','managers'].includes(c.list))fail('기준정보 종류 오류');
      if(c.type==='masterSave') {
        const old=c.value.id ? s[c.list].find(x=>x.id===c.value.id) : null;
        if(c.create && old)fail('이미 존재하는 기준정보 코드입니다. 수정 기능을 사용하십시오.');
        const v={...c.value,id:c.value.id || uid()};need(v.name,'기준정보 명칭');if(c.list==='classes')need(v.en,'영문 유형');
        if(s[c.list].some(x=>x.id!==v.id&&x.id.toLowerCase()===v.id.toLowerCase()))fail('중복 기준정보 코드');
        if(old)Object.assign(old,v);else s[c.list].push(v);label=v.name;
      } else {
        const v=get(s,c.list,c.id), key={classes:'classId',manufacturers:'manufacturerId',managers:'managerId'}[c.list];
        if(s.assets.some(a=>a[key]===v.id))v.active=false;else s[c.list]=s[c.list].filter(x=>x.id!==v.id);label=v.name;
      }
    } else if(c.type==='planSave') {
      const old=c.value.id ? get(s,'plans',c.value.id) : null;
      const p={...c.value,id:old?.id || uid(),months:Number(c.value.months)};
      const t=target(s,p.targetType,p.targetId);label=t.no || t.name;
      if(p.targetType==='process')fail('공정에는 점검 계획을 설정할 수 없습니다.');
      if(p.targetType==='tag' && t.kind!=='설비')fail('밸브와 계측기는 태그 조회만 지원합니다.');
      if(p.active && ((!t.active&&p.targetType==='tag') || (p.targetType==='asset'&&t.status!=='예비')) && (!old || old.targetId!==p.targetId || old.targetType!==p.targetType))fail('활성 설비 태그 또는 예비 자산을 선택하십시오.');
      if(old && s.records.some(r=>r.planId===old.id) && (old.targetType!==p.targetType || old.targetId!==p.targetId))fail('수행 기록이 있는 계획은 대상을 바꿀 수 없습니다. 새 계획을 등록하십시오.');
      need(p.item,'점검 항목');date(p.due,'예정일');if(!Number.isInteger(p.months)||p.months<1||p.months>120)fail('주기는 1~120개월의 정수입니다.');
      if(old)Object.assign(old,p);else s.plans.push(p);
    } else if(c.type==='recordSave') {
      const old=c.value.id ? get(s,'records',c.value.id) : null;
      const r={...c.value,id:old?.id || uid()};const p=get(s,'plans',r.planId);
      date(r.date,'수행 일자');if(r.date>today())fail('수행 기록은 미래 날짜를 사용할 수 없습니다.');
      need(r.performer,'수행자');need(r.result,'결과');need(r.action,'조치 내용');
      if(!['점검','정비'].includes(r.kind))fail('기록 종류 오류');
      if(old) {if(r.planId!==old.planId)fail('기록의 계획을 변경할 수 없습니다.');r.tagId=old.tagId;r.assetId=old.assetId;
        if(r.tagId && installedAt(s,r.tagId,r.date)?.assetId!==r.assetId)fail('변경한 일자의 설치 자산이 기록과 일치하지 않습니다.');
      } else {
        if(!p.active)fail('비활성 계획에는 수행 기록을 추가할 수 없습니다.');
        r.tagId=p.targetType==='tag'?p.targetId:'';
        r.assetId=r.tagId?installedAt(s,r.tagId,r.date)?.assetId:p.targetId;
        if(!r.assetId)fail('수행 일자에 설치된 자산이 없습니다.');
        const a=get(s,'assets',r.assetId);if(a.acquired&&r.date<a.acquired)fail('수행 일자는 취득일자보다 빠를 수 없습니다.');
        if(a.disposed&&r.date>=a.disposed)fail('폐기 이후에는 수행 기록을 등록할 수 없습니다.');
        date(r.nextDue,'다음 예정일');if(r.nextDue<=r.date)fail('다음 예정일은 수행일보다 뒤여야 합니다.');
        p.due=r.nextDue;
      }
      label=get(s,'assets',r.assetId).no;if(old)Object.assign(old,r);else s.records.push(r);
    } else if(c.type==='documentAdd') {
      need(c.value.title,'문서 제목');if(!(c.file instanceof Blob)||!c.file.size)fail('빈 파일은 등록할 수 없습니다.');
      const d={...c.value,id:uid(),size:c.file.size,type:c.file.type};label=d.title;s.documents.push(d);putFiles.push({id:d.id,blob:c.file});
      for(const l of c.links || []) {target(s,l.targetType,l.targetId);s.links.push({...l,id:uid(),documentId:d.id});}
    } else if(c.type==='linkAdd') {
      const d=get(s,'documents',c.documentId);target(s,c.targetType,c.targetId);label=d.title;
      if(s.links.some(l=>l.documentId===c.documentId&&l.targetType===c.targetType&&l.targetId===c.targetId))fail('이미 연결된 대상입니다.');
      s.links.push({id:uid(),documentId:c.documentId,targetType:c.targetType,targetId:c.targetId});
    } else if(c.type==='linkRemove') {
      const l=get(s,'links',c.id);label=get(s,'documents',l.documentId).title;s.links=s.links.filter(x=>x.id!==c.id);
    } else if(c.type==='documentRemove') {
      const d=get(s,'documents',c.id);if(s.links.some(l=>l.documentId===d.id))fail('모든 연결을 해제한 후 파일을 제거하십시오.');
      label=d.title;s.documents=s.documents.filter(x=>x.id!==d.id);deleteFiles.push(d.id);
    } else if(c.type==='import') {
      const review=reviewImport(s,c.rows);if(review.errors.length)fail('엑셀 검증 오류가 있습니다. '+review.errors.map(e=>e.row+'행 '+e.message).join(' / '));
      for(const row of review.entries) {
        const a={...row.asset,id:uid()};const status=a.status;a.status='예비';s.assets.push(a);
        if(row.tagId)install(s,a.id,row.tagId,row.date,'엑셀 신규 등록',status);
      }
      label=review.entries.length+'건 신규 등록';
    } else fail('지원하지 않는 작업입니다.');
    validate(s);
    const deltaBefore={},deltaAfter={};
    for(const key of ['assets','tags','classes','manufacturers','managers','installations','plans','records','documents','links']) {
      const removed=before[key].filter(x=>JSON.stringify(x)!==JSON.stringify(s[key].find(y=>y.id===x.id)));
      const added=s[key].filter(x=>JSON.stringify(x)!==JSON.stringify(before[key].find(y=>y.id===x.id)));
      if(removed.length||added.length){deltaBefore[key]=removed;deltaAfter[key]=added;}
    }
    s.changes.push({id:uid(),time:new Date().toISOString(),actor:actor.trim(),kind,target:label,before:deltaBefore,after:deltaAfter});
    return {state:s,putFiles,deleteFiles};
  }
  const columns={no:'자산번호',name:'자산명',en:'영문 자산명',classId:'설비 유형 코드',importance:'중요도',status:'운영 상태',manufacturerId:'제조사 코드',model:'모델명',part:'제조사 파트번호',spec:'규격과 사양',manufactured:'제조일자',acquired:'취득일자',lifespan:'내구연한',managerId:'관리 기관 코드',remark:'비고'};
  function reviewImport(s,rows) {
    const errors=[],entries=[],work=structuredClone(s),seen=new Set(s.assets.map(a=>a.no.toLowerCase()));
    if(!rows.length)errors.push({row:1,message:'등록할 자산 행이 없습니다.'});
    rows.forEach((r,index)=>{
      try {
        const a={id:uid()};for(const [k,h] of Object.entries(columns))a[k]=String(r[h]??'').trim();
        const start=errors.length;
        const issue=(field,message)=>errors.push({row:index+2,field,message});
        for(const key of ['no','name','en','classId','importance','status'])if(!a[key])issue(columns[key],columns[key]+' 필수값이 없습니다.');
        for(const key of Object.keys(r))if(/상위|parent_asset/i.test(key)&&String(r[key]??'').trim())issue(key,'상위 자산 항목은 이번 범위에서 지원하지 않습니다.');
        if(a.no){if(seen.has(a.no.toLowerCase()))issue('자산번호','중복 자산번호: '+a.no);seen.add(a.no.toLowerCase());}
        if(a.importance&&!['A','B','C'].includes(a.importance))issue('중요도','A, B, C를 사용하십시오.');
        if(a.status&&!['가동','정지','예비'].includes(a.status))issue('운영 상태','신규 등록은 가동, 정지 또는 예비입니다. 폐기는 별도 처리하십시오.');
        for(const [list,key]of [['classes','classId'],['manufacturers','manufacturerId'],['managers','managerId']])try{ref(s,list,a[key]);}catch(e){issue(columns[key],e.message);}
        for(const key of ['manufactured','acquired'])try{date(a[key],columns[key],false);}catch(e){issue(columns[key],e.message);}
        if(errors.length>start)return;
        assetValidate(work,a);if(a.status==='폐기')fail('신규 자산은 예비 등록 후 폐기 기능을 사용하십시오.');
        const tagNo=String(r['태그번호']??'').trim(), t=tagNo?work.tags.find(t=>t.no.toLowerCase()===tagNo.toLowerCase()):null;
        if(tagNo&&!t)fail('존재하지 않는 태그번호: '+tagNo);
        const when=String(r['설치일자']??'').trim();
        if(!t && (a.status!=='예비'||when))fail('태그 없는 신규 자산은 예비 상태이며 설치일자가 없어야 합니다.');
        if(t&&!['가동','정지'].includes(a.status))fail('태그 설치 자산은 가동 또는 정지 상태여야 합니다.');
        const original={...a};a.status='예비';work.assets.push(a);
        if(t)install(work,a.id,t.id,when,'엑셀 검토',original.status);
        entries.push({asset:original,tagId:t?.id||'',date:when});
      }catch(e){errors.push({row:index+2,field:'자산 정보 또는 설치 관계',message:e.message});}
    });
    return {errors,entries};
  }
  function documentsFor(s,a) {
    const i=current(s,a.id),tag=i&&get(s,'tags',i.tagId);
    const pids=new Set();let p=tag?.processId;while(p){pids.add(p);p=get(s,'processes',p).parentId;}
    return s.documents.map(d=>({...d,connections:s.links.filter(l=>l.documentId===d.id&&((l.targetType==='asset'&&l.targetId===a.id)||(l.targetType==='tag'&&l.targetId===tag?.id)||(l.targetType==='process'&&pids.has(l.targetId))))})).filter(d=>d.connections.length);
  }
  root.AssetDomain={uid,today,date,nextDate,seed,seedFiles,apply,validate,current,occupant,installedAt,reviewImport,columns,documentsFor};
  if(typeof module!=='undefined')module.exports=root.AssetDomain;
})(globalThis);
