# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 작업 규칙

- 메모리를 저장할 때는 반드시 `.claude/memory/` 폴더에 저장한다. 개인 정보(사용자 신상, 연락처 등)는 `.claude/memory/personal/`에 저장한다. 로컬 메모리 경로(`~/.claude/...`)에는 저장하지 않는다.

## Project Overview

**PROMISE DT** — 해수담수화 플랜트 디지털 트윈 PoC (Proof of Concept).
KSEAWATER02 과제(디지털 담수화 플랜트 농축수 자원화 기술개발사업) 2차년도 시스템 기획 단계의 UI PoC. 와이어프레임에 디자인까지 입힌 버전.

## Architecture

Static HTML pages (no build system, no framework). Each page is a self-contained single-file HTML with inline CSS and JS. Pages share a common design language via CSS variables and a shared navigation bar.

### Directory Structure

```
├── pages/          ← HTML 페이지
├── assets/         ← 이미지 (CI 로고 등)
├── models/         ← 3D 모델 (GLB)
├── scripts/        ← JS, Python 도구
├── docs/           ← 디자인 가이드 등
├── references/     ← 참고 문서·프로젝트 컨텍스트
```

### Key Files

- **`scripts/shared-navbar.js`** — Shared top dock/navbar injected into every page at runtime. Defines menu structure (`MENUS`), SVG icons, active-page detection, clock, and all dock CSS. Include via `<script src="../scripts/shared-navbar.js"></script>`.
- **`scripts/create_standalone.py`** — Python bundler that merges all HTML pages into a single `demo_standalone.html` for offline demo. Embeds images as Base64, inlines `shared-navbar.js`, embeds the GLB 3D model, and patches `window.location.href` navigation to `postMessage` routing between iframes.
- **`demo_standalone.html`** — Generated output (~200MB). Do not edit manually; regenerate with `uv run scripts/create_standalone.py`.
- **`models/concept.glb`** — 3D plant model loaded by `pages/main.html` via Three.js.

### Pages (in `pages/`)

| File | Purpose |
|------|---------|
| `login.html` | Login screen |
| `main.html` | Plant monitoring / 3D view (Three.js) |
| `page-operation.html` | 운영 정보 |
| `page-analysis.html` | 운영 분석 |
| `page-decision.html` | 의사결정 지원 |
| `page-diagnostics.html` | 진단·고장예지 |
| `page-asset.html` | 설계 정보·자산 관리 |
| `page-energy.html` | 에너지 모니터링 |

### Design System

**See [`docs/DESIGN_GUIDE.md`](docs/DESIGN_GUIDE.md) for the full design specification.** Always reference this file when creating or modifying UI components.

Key principles:
- **Light theme only** — all pages use `#EBF3F5` background with white cards. Never use dark backgrounds for content areas.
- Brand colors: `--c-green:#73CF79`, `--c-mint:#50B8B8`, `--c-blue:#3978B8`, `--c-navy:#1A202D`
- Gradients: `--grad-main` (135deg green→mint→blue), `--grad-h` (horizontal)
- Fonts: Plus Jakarta Sans (UI), JetBrains Mono (monospace/data)
- Dock height: `--dock-h: 84px` — all page content must account for this fixed top bar
- Cards: `background:white; border-radius:14px; border:1px solid rgba(80,184,184,0.1);`
- All pages use fixed `1920x1080` viewport with `fitViewport()` scaling from `shared-navbar.js`

## References (참고 문서·프로젝트 컨텍스트)

`references/` 디렉토리에 과제 배경, 회의 정리, 기획 문서 등 프로젝트 맥락 파일이 보관되어 있다.
새로운 작업 시 관련 파일을 참조하여 맥락을 파악할 것. 목록은 [`references/README.md`](references/README.md) 참조.

## Commands

### Regenerate standalone demo
```
uv run scripts/create_standalone.py
```
This bundles all HTML pages + assets into `demo_standalone.html`. Run from the project root.

## Conventions

- All pages are designed for `width=1920` viewport (desktop kiosk/dashboard use).
- Navigation between pages uses `window.location.href = 'page-xxx.html'`. The standalone bundler patches these to `postMessage` calls.
- Korean language UI throughout. Comments in source are also Korean.
- CI logos: `assets/main_ci.png` (navbar logo), `assets/login_ci.png` (login page logo).
- When adding a new page: add it to `pages/`, add its menu entry to the `MENUS` array in `scripts/shared-navbar.js`, and include `<script src="../scripts/shared-navbar.js"></script>` in the page. The bundler auto-discovers all `.html` files in `pages/`.
