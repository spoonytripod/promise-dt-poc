# PROMISE DT Design Guidelines

## Viewport & Layout

- Fixed viewport: `1920 x 1080px` (16:9)
- Scaling: `shared-navbar.js` applies `fitViewport()` which scales body via `transform: scale(s)` where `s = Math.min(innerWidth/1920, innerHeight/1080)`
- Body CSS: `width:1920px; height:1080px; flex-shrink:0; overflow:hidden; transform-origin:center center; position:relative;`
- HTML wrapper: `width:100vw; height:100vh; overflow:hidden; background:#000; display:flex; align-items:center; justify-content:center;`
- Dock height: `84px` (`--dock-h`). Page content starts below via `.page-shell { position:fixed; top:84px; left:0; right:0; bottom:0; }`

## Color System

### Brand Colors (CSS Variables)
```css
--c-green: #73CF79;    /* 물방울 상단 그린 */
--c-mint:  #50B8B8;    /* 핵심 강조 시안 */
--c-blue:  #3978B8;    /* 하단 블루 */
--c-navy:  #1A202D;    /* 텍스트 네이비 */
--c-teal:  #5CC196;    /* 전이 민트그린 */
```

### Gradients
```css
--grad-main: linear-gradient(135deg, #73CF79 0%, #50B8B8 50%, #3978B8 100%);
--grad-h:    linear-gradient(90deg, #73CF79 0%, #50B8B8 50%, #3978B8 100%);
```

### UI Semantic Colors
```css
--bg:            #EBF3F5;     /* 페이지 배경 (밝은 민트그레이) */
--border:        rgba(80,184,184,0.14);
--border-strong: rgba(80,184,184,0.24);
--text-1:        #1A202D;     /* 제목, 주요 텍스트 */
--text-2:        #3D5A6A;     /* 본문, 부제목 */
--text-3:        #7A9EAB;     /* 보조, 라벨 */
--accent:        #3978B8;
--accent-mid:    #50B8B8;
--accent-lt:     rgba(80,184,184,0.10);
--success:       #73CF79;
--warning:       #F59E0B;
--danger:        #EF4444;
```

### Status Colors
| State   | Background               | Text     |
|---------|--------------------------|----------|
| OK      | `rgba(115,207,121,0.12)` | `#2E7D32` |
| Warning | `rgba(245,158,11,0.12)`  | `#F59E0B` |
| Danger  | `rgba(239,68,68,0.08)`   | `#EF4444` |

## Theme: Light

**All pages use a light theme.** There is no dark theme in this project.

- Page background: `#EBF3F5`
- Card/panel background: `white` (`#FFFFFF`)
- Left navigation panel: `rgba(255,255,255,0.92)` with `backdrop-filter: blur(14px)`
- Border: `1px solid rgba(80,184,184,0.1)` (very subtle teal tint)
- Never use dark backgrounds (`#0B1420`, `#1A202D`, etc.) for content areas or overlays

## Typography

### Fonts
- Single family: `'Noto Sans KR', sans-serif` (UI·본문·수치·심볼 모두 동일 폰트)
- 회사 디자인 가이드(v1.0.0) 준수: 국문·영문·숫자·기호 통일

### Sizes
| Element        | Size   | Weight | Color    |
|----------------|--------|--------|----------|
| Page title     | 22px   | 800    | gradient |
| Page subtitle  | 13px   | 400    | `#7A9EAB` |
| Card title     | 13.5px | 700    | `#1A202D` |
| Card subtitle  | 11px   | 400    | `#7A9EAB` |
| Section tag    | 11.5px | 700    | `#7A9EAB` |
| Label          | 11-12px| 600    | `#7A9EAB` |
| KPI value      | 28px   | 800    | `#1A202D` |
| KPI unit       | 13px   | 500    | `#7A9EAB` |
| Body text      | 13-14px| 400-500| `#3D5A6A` |
| Small/mono     | 11-12px| 400    | `#7A9EAB` |

### Page Title Gradient
```css
font-size: 22px; font-weight: 800; letter-spacing: -0.02em;
background: linear-gradient(90deg, #73CF79, #50B8B8, #3978B8);
-webkit-background-clip: text; -webkit-text-fill-color: transparent;
```

## Components

### Card
```css
.card {
    background: white;
    border-radius: 14px;
    border: 1px solid rgba(80,184,184,0.1);
    overflow: hidden;
    transition: box-shadow 0.2s;
}
.card:hover {
    box-shadow: 0 4px 20px rgba(0,0,0,0.06);
}
```

### Card Header
```css
.card-hdr {
    display: flex; align-items: center; gap: 10px;
    padding: 14px 20px;
    border-bottom: 1px solid rgba(0,0,0,0.04);
}
```

### KPI Card
```css
.kpi-card {
    background: white;
    border-radius: 14px;
    padding: 16px 18px;
    border: 1px solid rgba(80,184,184,0.1);
}
/* Highlighted variant has top gradient bar */
.kpi-card.highlight::after {
    content: ''; position: absolute;
    top: 0; left: 0; right: 0; height: 3px;
    background: linear-gradient(90deg, #73CF79, #50B8B8, #3978B8);
}
```

### Buttons
```css
/* Default */
.btn {
    padding: 8px 16px; border-radius: 8px;
    font-size: 12.5px; font-weight: 600;
    border: 1px solid rgba(80,184,184,0.2);
    background: white; color: #3D5A6A;
}
/* Primary */
.btn-primary {
    background: linear-gradient(135deg, #50B8B8, #3978B8);
    color: white; border-color: transparent;
}
```

### Range/Tab Selector
```css
.range-tabs {
    display: flex; gap: 2px;
    background: rgba(80,184,184,0.08);
    border-radius: 8px; padding: 3px;
}
.range-tab.active {
    background: white; color: #3978B8;
    box-shadow: 0 1px 4px rgba(0,0,0,0.08);
}
```

### Left Navigation (LNB)
```css
.lnb {
    width: 230px;
    background: rgba(255,255,255,0.92);
    backdrop-filter: blur(14px);
    border-right: 1px solid rgba(80,184,184,0.16);
    padding: 20px 0;
}
.lnb-item.active::before {
    /* Left accent bar: gradient green-to-blue */
    background: linear-gradient(180deg, #73CF79, #3978B8);
}
```

## Spacing

- Page padding: `24px 32px 40px`
- Card inner padding: `18px 20px`
- Grid gap (cards): `14px` - `16px`
- Section margin-bottom: `18px` - `22px`
- Element gap (small): `6px` - `10px`

## Shadows

- Card hover: `0 4px 20px rgba(0,0,0,0.06)`
- KPI hover: `0 6px 24px rgba(80,184,184,0.12)`
- Primary button hover: `0 4px 16px rgba(57,120,184,0.3)`
- Elevated panel: `0 16px 54px rgba(0,0,0,0.14), 0 0 0 1px rgba(0,0,0,0.04)`

## Border Radius

- Card/Panel: `14px`
- Button: `8px`
- Badge: `100px` (pill)
- Small element: `6px`
- Large panel/modal: `20px`

## Animation

- Default transition: `all 0.2s ease` or `0.15s`
- Hover lift: `transform: translateY(-2px)`
- Panel slide: `0.4s cubic-bezier(0.34, 1.4, 0.64, 1)`

## Anti-patterns (Do NOT use)

- Dark backgrounds for content areas (e.g., `#0B1420`, `#1A202D`)
- Neon/glow effects on text
- Bright colored text on dark panels
- Standalone scrollbars with custom styling outside existing patterns
- Drop shadows heavier than `0 16px 54px rgba(0,0,0,0.14)`
