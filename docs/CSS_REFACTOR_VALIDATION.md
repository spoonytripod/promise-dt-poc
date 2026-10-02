# CSS 구조 통일과 검증 결과

작성일: 2026-10-02

8개 HTML 페이지의 style 정의 블록을 styles/pages 아래로 이동했습니다. scripts/asset-ui.css는 styles/pages/asset.css로 옮겼습니다. 공통 상단 메뉴의 CSS는 styles/navbar.css로 분리하여 shared-navbar.js의 스타일 생성 코드를 제거했습니다.

공통 색상과 글꼴 및 화면 규격은 styles/common.css에서 관리합니다. 운영 정보, 운영 분석, 의사결정 지원, 진단과 에너지의 동일한 컴포넌트 규칙 20개는 styles/components.css로 모았습니다. :where(.dashboard-page) 범위로 기존 우선순위를 유지하고 다른 화면의 컴포넌트와 충돌하지 않도록 했습니다. 페이지별 차이가 있는 스타일은 전용 파일에 남겼습니다.

HTML의 기존 개별 style 속성과 JavaScript의 상태별 style 변경은 유지했습니다. 이번 범위는 외부 CSS 파일 구조로의 통일과 중복된 정의 정리입니다. 화면 내부 디자인은 유지하며, 아래에 기록한 바깥 배경색 통일을 추가로 적용했습니다.

## 검증 결과

| 검사 | 결과 |
| --- | --- |
| Chrome에서 변경 전 커밋 c128706과 8개 Web 페이지 비교 | 모든 페이지 통과, 바깥 배경색 변경을 제외한 계산된 스타일과 요소 위치 차이 0건 (자산 관리 좌측 메뉴 개편 영역 제외) |
| Edge에서 같은 비교 | 모든 페이지 통과, 바깥 배경색 변경 외 차이 0건 |
| Chrome과 Edge에서 단일 HTML의 8개 페이지 검사 | 로컬 CSS 링크가 모두 내장됨, 본문 1920px 및 상단 메뉴 84px 확인 |
| Chrome과 Edge의 3가지 추가 창 크기 | 8개 페이지씩 총 48건 통과, 메뉴 포함 여부와 배경색 확인 |
| 이전 HTML과 현재 스크립트 조합 | 문제 메뉴 4개씩 총 8건 통과, CSS 로딩과 링크 중복 방지 확인 |
| 자산 관리 회귀 검사 | Chrome Web, Chrome file, Edge Web, Edge file 모두 통과 |
| 생성기 및 JavaScript | 단일 HTML 생성 성공, JavaScript 구문 검사와 git diff --check 통과 |

Web 비교는 개편한 자산 관리 좌측 메뉴를 제외한 DOM 요소와 before 및 after 가상 요소의 계산된 CSS 속성을 비교합니다. 의도한 HTML 배경색 변경은 비교에서 정규화하며, 별도 검사에서 모든 페이지가 #EBF3F5인지 확인합니다. 공통 변수의 추가 자체는 제외하고 변수가 실제 속성에 적용된 결과를 확인합니다. 난수와 시계를 고정하고 등장 애니메이션은 완료 상태, 반복 애니메이션은 같은 시점으로 맞춥니다. 등장 효과를 중단하여 콘텐츠가 숨겨진 상태로 비교하지 않습니다.

단일 HTML 검사는 서버 없이 file 경로로 실행하며, 외부 요청을 차단해 로컬 CSS 링크의 누락을 확인합니다. 기존의 외부 글꼴과 메인 3D 라이브러리 의존성은 유지하므로 실제 3D 렌더링이나 외부 글꼴 로딩까지 검증한 결과는 아닙니다.

자산 회귀 검사는 기존 검증 스크립트로 등록과 수정, 설치와 해체 및 교체, 점검, 문서 다운로드, 엑셀, 기준정보, 변경 이력, 저장 실패, 브라우저 재실행, 초기화와 메뉴 이동을 확인했습니다. 기존 검증 산출물은 이번 작업에서 덮어쓰지 않고 유지했습니다.

## 실행과 증거

스타일 적용 순서와 신규 화면 작성 방법은 [CSS 구성 안내](../styles/README.md)에 있습니다. 정적 Web 실행 방법과 자산 기능의 제약은 [자산 관리 검증 안내](ASSET_MANAGEMENT_VALIDATION.md)를 참고하십시오.

```powershell
npm ci
python scripts/create_standalone.py
```

별도 터미널에서 python -m http.server 8000을 실행한 뒤 검사합니다.

```powershell
npm run test:css
npm run test:browser
```

[CSS 결과 JSON](css-validation/results.json), [운영 정보 화면](css-validation/Chrome-page-operation.png), [자산대장 화면](css-validation/Chrome-page-asset.png)에 증거를 보관했습니다. 테스트 스크립트는 scripts/test-css-browser.cjs입니다. CSS_BASELINE 환경변수로 비교 커밋을 지정할 수 있으며 기본값은 c128706입니다.

생성기는 실제 HTML의 stylesheet 링크를 원래 순서로 내장합니다. CSS 로컬 url() 리소스는 해당 CSS 파일 위치에서 해석하여 내장하며 data URL과 SVG 내부 참조는 그대로 둡니다. CSS @import는 조용히 누락시키지 않고 오류를 표시하므로 HTML에 별도 stylesheet 링크로 추가하십시오. 생성물인 demo_standalone.html은 직접 수정하지 않습니다.

## 메뉴 상단바와 바깥 배경 수정

실제 Chrome에서 운영 정보로 이동했을 때, 이전 HTML이 캐시되어 외부 CSS 링크 없이 로드되는 상황을 확인했습니다. 새 shared-navbar.js는 CSS 주입을 제거한 상태여서 상단바에 display:flex가 적용되지 않았습니다. 최신 HTML만 새 컨텍스트에서 검사했던 최초 검증으로는 이 조합을 확인하지 못했습니다.

공통 스크립트가 실행될 때 common.css와 navbar.css 링크가 없는 경우에만 추가하도록 보완했습니다. CSS 규칙은 외부 파일에서 관리하고 단일 HTML은 생성기가 내장한 CSS를 사용합니다. 또한 각 페이지의 HTML 배경색 정의를 제거하고 common.css의 --bg (#EBF3F5)로 통일했습니다. 페이지를 축소할 때 나타나는 바깥 영역도 같은 색상을 사용합니다.

추가 검사는 Chrome과 Edge에서 1600×900, 1366×768, 2048×983 크기의 8개 페이지를 검사합니다. 모든 페이지의 바깥 배경색과 상단 메뉴 9개의 포함 여부를 확인합니다. 운영 정보, 운영 분석, 의사결정 지원, 진단고장예지의 이전 HTML과 현재 스크립트를 함께 로드하는 검사도 추가하여 CSS 자동 로딩과 새로고침 후 링크 중복 방지를 확인합니다.

이번 수정 후 CSS 검사는 총 88건 모두 통과했습니다. 실제 Chrome에서도 운영 정보부터 진단고장예지까지 메뉴를 이동하고 자산 관리와 바깥 배경색을 비교하여 정상 표시를 확인했습니다. [축소 화면 검증 이미지](css-validation/Chrome-operation-window.png)를 추가했습니다.

CSS가 없는 이전 HTML에서는 필요한 파일을 불러오는 동안 상단바를 숨기고 로딩이 끝나면 표시합니다. 상단바 DOM은 기존 시점에 생성하여 페이지 스크립트가 참조할 수 있도록 유지합니다. 캐시 조합 검사는 CSS 응답을 보류하여 로딩 전에는 상단바가 숨겨지고 로딩 후에는 정상 표시되는지도 확인합니다.

## 자산 관리 좌측 메뉴 디자인 통일

자산 관리의 좌측 메뉴가 components.css의 공통 LNB 규칙을 사용하도록 변경했습니다. 제목, 230px 폭, 상하 및 좌우 간격, 16px 선형 아이콘, 전체 폭 선택 배경과 왼쪽 그라데이션 표시를 다른 2D 대시보드와 맞췄습니다. 메뉴 아래에는 안내 문구와 입력 작업자 및 저장소 조작 버튼을 유지했습니다. 선택 메뉴는 aria-current로 표시합니다.

Chrome과 Edge의 Web 및 단일 HTML에서 운영 분석 좌측 메뉴와 폭, 배경, 패딩, 글꼴, 선택 색상 등의 계산된 스타일이 같은지 비교하여 4가지 실행 조합 모두 통과했습니다. 다섯 메뉴를 각각 클릭하여 선택 표시와 콘텐츠 전환도 확인했습니다. [메뉴 디자인 검증 결과](css-validation/asset-navigation-results.json)와 [변경 화면](css-validation/Chrome-asset-navigation-web.png)에 증거를 보관했습니다. 기존 CSS 비교에서는 의도적으로 개편한 자산 관리 좌측 메뉴만 제외하며 다른 영역은 계속 비교합니다.

자산 페이지에서 변경된 CSS와 스크립트 URL에는 캐시 구분값을 추가했습니다. 단일 HTML 생성기도 스크립트 URL의 쿼리를 처리하여 동일한 파일을 내장합니다.
