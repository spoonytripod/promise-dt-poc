# 설계 정보 및 자산 관리 구현 명세

작성일: 2026-10-02. 범위 기준은 ASSET_MANAGEMENT_IMPLEMENTATION_PLAN.md입니다.

이 화면은 예시 데이터를 사용하는 동작형 시제품입니다. 운영 DB, 인증, SCADA와 3D 연결은 구현하지 않습니다. 원본 연구 자료에서 보류한 설치 이력과 기준정보도 이번 시제품에 포함합니다. 부속 자산과 재고, 부품 명세, 권한 구분은 제외합니다.

## 화면과 처리

| 화면 | 기능 ID | 입력과 결과 |
| --- | --- | --- |
| 자산대장 | AM-01~08 | 시설, 공정, 태그 범위 선택, 필터, 정렬, 페이징, 상세, 등록과 수정, 설치, 해체, 교체, 폐기 |
| 점검과 정비 | AM-09~11 | 태그 또는 예비 자산에 계획, 달력 주기와 예정일, 수행자, 결과, 조치, 당시 자산, 다음 예정일 |
| 도면과 문서 | AM-12 | 파일 원본 한 개와 여러 연결, 다운로드, 연결 해제, 참조 없는 파일 삭제 |
| 엑셀 | AM-13~14 | xlsx 양식과 코드 안내, 행별 사전 검토, 전체 검증과 일괄 등록, 검색 결과 전체 내보내기 |
| 기준정보 | AM-15~16 | 제조사, 관리 기관, 설비 분류, 태그의 등록과 변경, 비활성화, 도면 근거와 순환 검사 |
| 변경 이력 | AM-17 | 대상 검색, 기간과 종류, 변경 전후 값, 입력 작업자와 시각 |
| 초기화 | AM-18 | 확인 후 전용 IndexedDB의 상태와 파일만 초기화 |

## 데이터 대응과 확장

| 시제품 컬렉션 | 원본 개념 | 저장 원칙 |
| --- | --- | --- |
| assets | asset_info | 불변 id와 변경 가능한 자산번호 no 분리. 국문 및 영문 명칭, 분류 코드, 중요도, 상태, 제품과 도입 정보, 관리 코드 |
| tags, processes | tag_info, process_info | 불변 id, 태그번호, 공정과 상위 태그, 도면 근거 |
| classes, manufacturers, managers | asset_class, mfr_info, mgr_info | 코드 참조. 연락처, 영문 유형과 관리 부서는 조회하여 표시 |
| installations | DB 확장 필요 | 자산과 태그, 시작일과 종료일, 사유. 설치일자는 여기서 조회 |
| plans, records | DB 확장 필요 | 계획 대상과 주기, 예정일. 수행 당시 자산과 태그는 변경하지 않음 |
| documents, links, IndexedDB files | DB 확장 필요 | 원본 Blob, 메타데이터, 대상별 연결 분리 |
| changes | DB 확장 필요 | 전후 값과 작업자명. 인증된 사용자 감사 기록이 아님 |

원본 asset_id는 자산번호로 정의되어 있으나, 시제품은 번호 수정 후에도 연결을 유지하기 위해 별도 불변 id를 둡니다. 실제 DB 전환 시 키 정책 협의가 필요합니다. 신설 요청 문서와 DDL은 운영 DB의 현 상태 증거가 아닙니다.

### 자산 속성별 대응

| 시제품 필드 | 원본 속성 또는 조회 경로 |
| --- | --- |
| assets.id / assets.no | 시제품 불변 키 / 원본 asset_id (자산번호) |
| installations.tagId | tag_info.tag_id. 태그번호는 tags.no에서 조회 |
| assets.name / assets.en | asset_nm / asset_enm |
| assets.classId | asset_class_cd. 영문 유형은 classes.en에서 조회 |
| assets.importance / assets.status | critical_cd / status_cd |
| assets.manufacturerId | mfr_id. 제조사명과 연락처는 manufacturers에서 조회 |
| assets.model / assets.part / assets.spec | model_no / mfr_part_no / spec_desc |
| assets.manufactured / assets.acquired | mfg_dt / acquire_dt |
| installations.start | install_dt. 일반 자산 수정 양식에서 편집하지 않음 |
| assets.lifespan | lifespan_yr |
| assets.managerId | mgr_id. 기관명, 부서, 담당자와 연락처는 managers에서 조회 |
| assets.remark | remark |
| 미지원 | parent_asset_id와 상위 자산 태그. 엑셀 입력 시 오류 표시 |

시제품 날짜는 YYYY-MM-DD 문자열입니다. 원본 YYYYMMDD 속성과 실제 DB로 전환할 때 형식을 변환해야 합니다. 설치 기간은 시작일 포함, 종료일 제외이며 같은 날의 세부 시각은 구분하지 않습니다. 설치 당일 해체하는 0일 기간은 차단합니다. 시제품은 실제 인증이나 변경 이력의 위변조 방지 기능을 제공하지 않습니다.

## 저장과 배포

asset-store.js는 promise-asset-prototype-v1 데이터베이스에 상태와 파일을 함께 저장합니다. revision 비교와 단일 readwrite 트랜잭션으로 교체와 엑셀 등록의 부분 저장 및 다른 창의 덮어쓰기를 차단합니다. 실패하면 화면 상태는 이전 값을 유지합니다. 최초 실행에만 예시 데이터를 등록합니다.

Web은 페이지에서 저장소에 접근합니다. 단일 HTML은 부모 래퍼가 저장 서비스를 보유하고 자산 iframe만 메시지 요청을 보낼 수 있습니다. 요청 ID, 응답 성공 여부와 시간 초과를 구분합니다. Web과 로컬 HTML 데이터는 독립적입니다. 브라우저 데이터 삭제 시 첨부파일도 사라집니다.

SheetJS CE 0.20.3은 scripts/vendor에 배포본과 라이선스를 보관합니다. 공식 출처: https://docs.sheetjs.com/docs/getting-started/installation/standalone/ . 단일 HTML 생성기에 로직, CSS와 라이브러리를 내장합니다.
