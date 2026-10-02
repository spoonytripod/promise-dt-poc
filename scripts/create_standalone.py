"""
create_standalone.py
────────────────────
모든 HTML 페이지를 단일 HTML 파일로 번들.

동작 방식:
  - 스크립트 위치 기준으로 BASE_DIR 자동 감지 (사용자 경로 무관)
  - 폴더 내 모든 HTML 파일을 자동 수집
  - 각 페이지를 iframe(blob URL)으로 격리해 CSS/JS 충돌 방지
  - shared-navbar.js를 인라인으로 각 페이지에 삽입
  - 페이지 간 window.location.href 이동을 postMessage 라우팅으로 패치
  - GLB 3D 모델·CI 이미지를 Base64로 임베드 → 외부 파일 불필요
"""

import base64
import json
import os
import re
import sys

# ── 경로 설정 (스크립트 위치 기준 → 프로젝트 루트) ────────────────────────
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(SCRIPT_DIR)
PAGES_DIR = os.path.join(ROOT_DIR, 'pages')
ASSETS_DIR = os.path.join(ROOT_DIR, 'assets')

# ── 번들 대상 HTML 파일 자동 수집 ─────────────────────────────────────────
EXCLUDE_FILES = {'demo_standalone.html'}

html_files = sorted([
    f for f in os.listdir(PAGES_DIR)
    if f.endswith('.html') and f not in EXCLUDE_FILES
])

print(f"▶  ROOT_DIR: {ROOT_DIR}")
print(f"▶  PAGES_DIR: {PAGES_DIR}")
print(f"▶  발견된 HTML 파일 ({len(html_files)}개):")
for f in html_files:
    print(f"   • {f}")

# ── 페이지 ID 생성: 파일명에서 확장자 제거, 하이픈을 언더스코어로 ─────────
def make_page_id(filename: str) -> str:
    return filename.replace('.html', '').replace('-', '_')

FILES = {make_page_id(f): f for f in html_files}

# 네비게이션 패치 맵: 파일명 → 페이지 ID
NAV_MAP = {filename: page_id for page_id, filename in FILES.items()}

GLB_PATH = next((p for p in [
    os.path.join(ROOT_DIR, 'models', 'seperated_comp.glb'),
    os.path.join(ROOT_DIR, 'models', 'concept.glb'),
] if os.path.exists(p)), os.path.join(ROOT_DIR, 'models', 'concept.glb'))
OUTPUT_PATH = os.path.join(ROOT_DIR, 'demo_standalone.html')

# ── shared-navbar.js 인라인 로딩 ──────────────────────────────────────────
NAVBAR_JS_PATH = os.path.join(SCRIPT_DIR, 'shared-navbar.js')
navbar_js_content = ''
if os.path.exists(NAVBAR_JS_PATH):
    with open(NAVBAR_JS_PATH, 'r', encoding='utf-8') as f:
        navbar_js_content = f.read()
    print(f"\n▶  shared-navbar.js 로드 완료 ({len(navbar_js_content) // 1024} KB)")
else:
    print(f"\n⚠  shared-navbar.js 파일 없음 (건너뜀)")

# ── version.js 인라인 로딩 ────────────────────────────────────────────────
VERSION_JS_PATH = os.path.join(SCRIPT_DIR, 'version.js')
version_js_content = ''
if os.path.exists(VERSION_JS_PATH):
    with open(VERSION_JS_PATH, 'r', encoding='utf-8') as f:
        version_js_content = f.read()
    print(f"▶  version.js 로드 완료")
else:
    print(f"⚠  version.js 파일 없음 (건너뜀)")


def embed_images(html: str, base_dir: str) -> str:
    """로컬 이미지(src="...") 파일을 Base64 data URI로 교체"""
    mime_map = {
        'png': 'image/png', 'jpg': 'image/jpeg', 'jpeg': 'image/jpeg',
        'svg': 'image/svg+xml', 'gif': 'image/gif', 'webp': 'image/webp',
    }

    def replacer(m):
        src = m.group(1)
        if src.startswith(('http', 'data:', '//')):
            return m.group(0)
        path = os.path.join(base_dir, src)
        if not os.path.exists(path):
            print(f"  [skip] 이미지 없음: {src}")
            return m.group(0)
        ext = os.path.splitext(src)[1].lower().lstrip('.')
        mime = mime_map.get(ext, 'image/png')
        with open(path, 'rb') as f:
            data = base64.b64encode(f.read()).decode('ascii')
        print(f"  [embed] {src}  ({len(data) // 1024} KB)")
        return f'src="data:{mime};base64,{data}"'

    return re.sub(r'src="([^"]+\.(png|jpg|jpeg|svg|gif|webp))"', replacer, html)


def inline_navbar_js(html: str) -> str:
    """<script src="shared-navbar.js"></script> 를 인라인 스크립트로 교체"""
    if not navbar_js_content:
        return html
    navbar_safe = re.sub(r'</script', lambda m: '<\\/' + m.group(0)[2:], navbar_js_content, flags=re.I)
    inline_tag = f'<script>\n{navbar_safe}\n</script>'
    # src 속성의 따옴표 종류에 관계없이 교체
    html = html.replace('<script src="../scripts/shared-navbar.js"></script>', inline_tag)
    html = html.replace("<script src='../scripts/shared-navbar.js'></script>", inline_tag)
    # 레거시 패턴도 처리
    html = html.replace('<script src="shared-navbar.js"></script>', inline_tag)
    html = html.replace("<script src='shared-navbar.js'></script>", inline_tag)

    # version.js 인라인 삽입
    if version_js_content:
        version_safe = re.sub(r'</script', lambda m: '<\\/' + m.group(0)[2:], version_js_content, flags=re.I)
        ver_tag = f'<script>\n{version_safe}\n</script>'
        html = html.replace('<script src="../scripts/version.js"></script>', ver_tag)
        html = html.replace('<script src="version.js"></script>', ver_tag)

    return html


def patch_nav(html: str) -> str:
    """
    window.location.href = 'FILENAME' 패턴을
    window.parent.postMessage({type:'navigate', page:'ID'}, '*') 로 교체
    """
    for filename, page_id in NAV_MAP.items():
        msg = f"window.parent.postMessage({{type:'navigate',page:'{page_id}'}}, '*')"
        # 다양한 패턴 처리 (공백 유무, 따옴표 종류)
        html = html.replace(f"window.location.href = '{filename}'", msg)
        html = html.replace(f'window.location.href = "{filename}"', msg)
        html = html.replace(f"window.location.href='{filename}'", msg)
        html = html.replace(f'window.location.href="{filename}"', msg)
    # 공통 메뉴는 변수 href로 이동하므로 정적 문자열 패치에 추가 대응
    routes = json.dumps(NAV_MAP)
    html = html.replace('window.location.href = href;',
                        f"window.parent.postMessage({{type:'navigate',page:({routes})[href]}}, '*');")
    return html


def inline_asset_dependencies(html: str) -> str:
    """자산 관리 파일만 로컬 의존성을 내장합니다. 외부 CDN을 사용하지 않습니다."""
    def script(match):
        path = os.path.normpath(os.path.join(PAGES_DIR, match.group(1)))
        with open(path, 'r', encoding='utf-8') as source:
            code = source.read().replace('</script', '<\\/script')
        return '<script>\n' + code + '\n</script>'

    html = re.sub(r'<script src="(../scripts/(?:asset-[^"/]+|vendor/xlsx.full.min)\.js)"></script>', script, html)
    with open(os.path.join(SCRIPT_DIR, 'asset-ui.css'), 'r', encoding='utf-8') as source:
        html = html.replace('<link href="../scripts/asset-ui.css" rel="stylesheet">',
                            '<style>' + source.read() + '</style>')
    return html.replace('<head>', '<head><script>window.ASSET_STANDALONE_CLIENT=true;</script>', 1)


# ── 각 페이지 로드 & 처리 ────────────────────────────────────────────────
processed = {}

for page_id, filename in FILES.items():
    path = os.path.join(PAGES_DIR, filename)
    if not os.path.exists(path):
        print(f"\n⚠  {filename} 파일 없음, 건너뜀")
        continue

    print(f"\n▶  {filename}  (id: {page_id})")
    with open(path, 'r', encoding='utf-8') as f:
        html = f.read()

    # 로컬 이미지 임베드 (pages/ 기준 상대경로 해석)
    html = embed_images(html, PAGES_DIR)

    # Blob URL에서도 활성 메뉴를 정확히 표시
    html = html.replace('<head>', '<head><script>window.PROMISE_PAGE_FILE=' + json.dumps(filename) + ';</script>', 1)
    if page_id == 'page_asset':
        html = inline_asset_dependencies(html)

    # shared-navbar.js 인라인 삽입
    html = inline_navbar_js(html)
    # 상단 메뉴 스크립트가 생성하는 로고도 내장
    html = embed_images(html, PAGES_DIR)

    # 메인 페이지: GLB 3D 모델 임베드
    if page_id == 'main' and os.path.exists(GLB_PATH):
        print(f"  [embed] GLB 모델 임베드 중...")
        with open(GLB_PATH, 'rb') as f:
            glb_b64 = base64.b64encode(f.read()).decode('ascii')
        glb_uri = f"data:application/octet-stream;base64,{glb_b64}"
        # 새 경로 (../models/) 및 레거시 경로 (models/) 모두 처리
        html = html.replace("loader.load('../models/concept.glb'", f"loader.load('{glb_uri}'")
        html = html.replace("loader.load('../models/seperated.glb'", f"loader.load('{glb_uri}'")
        html = html.replace("loader.load('../models/seperated_comp.glb'", f"loader.load('{glb_uri}'")
        html = html.replace("loader.load('models/concept.glb'", f"loader.load('{glb_uri}'")
        print(f"  [embed] GLB ({len(glb_b64) // 1024} KB)")
    elif page_id == 'main':
        print(f"  [skip] GLB 파일 없음: {GLB_PATH}")

    # 페이지 간 네비게이션 패치
    html = patch_nav(html)

    processed[page_id] = html
    print(f"  완료  ({len(html) // 1024} KB)")


# ── 래퍼 HTML 생성 ───────────────────────────────────────────────────────

def safe_json(html_str: str) -> str:
    """JSON 인코딩 후 </script>를 이스케이프하여 HTML <script> 블록 내에서 안전하게 사용"""
    s = json.dumps(html_str)
    s = s.replace('</script>', '<\\/script>')
    s = s.replace('</Script>', '<\\/Script>')
    s = s.replace('</SCRIPT>', '<\\/SCRIPT>')
    return s

# 시작 페이지 결정 (login 페이지가 있으면 login, 아니면 첫 번째 페이지)
start_page = 'login' if 'login' in processed else list(processed.keys())[0]

# PAGE_HTML JS 객체 문자열 생성
page_entries = []
for pid, html_content in processed.items():
    page_entries.append(f"      {pid}: {safe_json(html_content)}")
page_html_js = ',\n'.join(page_entries)

# iframe 태그 생성
iframe_tags = []
for pid in processed:
    active = ' active' if pid == start_page else ''
    iframe_tags.append(f'  <iframe id="frame-{pid}" class="page-frame{active}"></iframe>')
iframe_html = '\n'.join(iframe_tags)

with open(os.path.join(SCRIPT_DIR, 'asset-store.js'), 'r', encoding='utf-8') as source:
    asset_store_js = source.read().replace('</script', '<\\/script')

wrapper = f"""<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=1920">
  <title>PROMISE DT — 통합 데모</title>
  <style>
    *, *::before, *::after {{ margin: 0; padding: 0; box-sizing: border-box; }}
    html, body {{ width: 100%; height: 100%; overflow: hidden; background: #EBF3F5; }}
    .page-frame {{
      position: fixed;
      inset: 0;
      width: 100%;
      height: 100%;
      border: none;
      display: none;
    }}
    .page-frame.active {{ display: block; }}
  </style>
</head>
<body>
{iframe_html}

  <script>
    {asset_store_js}
    AssetStore.serve(document.getElementById('frame-page_asset'));
    /* ── 각 페이지 HTML → Blob URL → iframe.src ── */
    const PAGE_HTML = {{
{page_html_js}
    }};

    Object.entries(PAGE_HTML).forEach(([id, html]) => {{
      const blob = new Blob([html], {{ type: 'text/html; charset=utf-8' }});
      document.getElementById('frame-' + id).src = URL.createObjectURL(blob);
    }});

    /* ── 페이지 전환 라우터 (postMessage) ── */
    window.addEventListener('message', function (e) {{
      if (!e.data || e.data.type !== 'navigate') return;
      if (![...document.querySelectorAll('.page-frame')].some(f => f.contentWindow === e.source)) return;
      const target = e.data.page;
      const frame = document.getElementById('frame-' + target);
      if (!frame) return;
      document.querySelectorAll('.page-frame').forEach(f => f.classList.remove('active'));
      frame.classList.add('active');
    }});
  </script>
</body>
</html>
"""

print(f"\n▶  총 {len(processed)}개 페이지 번들 완료")
print(f"   페이지 목록: {', '.join(processed.keys())}")
print(f"\n▶  출력 파일 작성: {OUTPUT_PATH}")
with open(OUTPUT_PATH, 'w', encoding='utf-8') as f:
    f.write(wrapper)

size_kb = os.path.getsize(OUTPUT_PATH) // 1024
print(f"   완료! 파일 크기: {size_kb:,} KB ({size_kb // 1024} MB)")
