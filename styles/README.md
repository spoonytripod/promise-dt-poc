# CSS 구성

모든 화면은 HTML에서 외부 CSS 파일을 불러옵니다. 새 프레임워크나 빌드 단계는 필요하지 않습니다.

| 파일 | 역할 |
| --- | --- |
| common.css | 공통 색상과 글꼴, 1920×1080 화면 규격 |
| components.css | 운영 정보, 운영 분석, 의사결정 지원, 진단, 에너지 화면의 동일한 버튼과 카드 및 왼쪽 메뉴 |
| navbar.css | 상단 메뉴, 아이콘, 시계와 사용자 표시 |
| pages/login.css | 로그인 |
| pages/main.css | 플랜트 모니터링 |
| pages/operation.css | 운영 정보 |
| pages/analysis.css | 운영 분석 |
| pages/decision.css | 의사결정 지원 |
| pages/diagnostics.css | 진단과 고장예지 |
| pages/asset.css | 설계 정보 및 자산 관리 |
| pages/energy.css | 에너지 모니터링 |

## 적용 순서

```html
<link rel="stylesheet" href="../styles/common.css">
<link rel="stylesheet" href="../styles/components.css">
<link rel="stylesheet" href="../styles/pages/operation.css">
<link rel="stylesheet" href="../styles/navbar.css">
```

상단 메뉴가 없는 로그인 화면은 마지막 링크를 제외합니다. 공통 상단 메뉴는 기존처럼 페이지 스타일보다 나중에 적용합니다. shared-navbar.js는 메뉴 동작과 시계를 담당하며 스타일을 생성하지 않습니다.

다섯 업무 화면은 body에 dashboard-page 클래스를 사용합니다. components.css의 :where(.dashboard-page) 범위는 기존 선택자 우선순위를 높이지 않습니다. 로그인, 메인과 자산 화면은 이 범위 밖이며 각 화면의 기존 컴포넌트 모양을 유지합니다. 페이지별 차이가 있는 KPI, 제목, 표와 팝업은 전용 파일에서 관리합니다.

기존 HTML의 개별 style 속성과 JavaScript의 style 변경은 그대로 유지했습니다. 이번 작업은 스타일 정의 블록과 공통 스타일 생성 코드를 외부 CSS로 옮기는 작업이며, 데이터 상태 표시와 요소별 기존 조정값을 전면 재작성하는 작업은 아닙니다.

## 단일 HTML

python scripts/create_standalone.py를 실행하면 HTML의 로컬 stylesheet 링크를 같은 순서의 style 블록으로 내장합니다. 실제 HTML 태그를 파싱하므로 JavaScript 문자열에 포함된 link와 head 예시는 수정하지 않습니다. CSS의 로컬 url() 파일도 CSS 파일의 위치를 기준으로 내장하며 기존 data URL과 SVG 내부 참조는 유지합니다. 원격 글꼴 링크는 기존 방식 그대로입니다.

CSS @import 대신 HTML에 stylesheet 링크를 추가하십시오. 누락된 파일이나 프로젝트 밖의 로컬 경로는 오류로 처리합니다. 생성한 demo_standalone.html은 직접 수정하지 않습니다.

## 검증

별도 터미널에서 python -m http.server 8000을 실행하고 아래 명령을 사용합니다.

```powershell
npm ci
python scripts/create_standalone.py
npm run test:css
npm run test:browser
```

CSS 검사는 변경 전 커밋 c128706과 현재 Web의 모든 요소 및 가상 요소의 계산된 스타일과 위치를 비교합니다. 모의 데이터의 난수, 시계와 애니메이션을 고정합니다. CSS_BASELINE 환경변수로 비교 커밋을 바꿀 수 있습니다. Chrome과 Edge에서 실행하며 8개 페이지의 단일 HTML 스타일 내장도 확인합니다. 상세 결과는 docs/css-validation/results.json에 기록합니다.

바깥 영역 배경은 common.css의 html 규칙에서 --bg로 통일합니다. shared-navbar.js는 캐시된 이전 HTML에 common.css 또는 navbar.css 링크가 없을 때 해당 파일을 추가합니다. CSS 규칙은 스크립트에 복제하지 않습니다.
