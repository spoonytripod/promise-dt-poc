/* ═══════════════════════════════════════════════════════════════
   PROMISE DT — Shared Top Dock Bar  (shared-navbar.js)
   ─────────────────────────────────────────────────────────────
   사용법:  <script src="shared-navbar.js"></script>
           자동으로 #dock 삽입 + 시계 갱신 + 현재 페이지 활성 표시
═══════════════════════════════════════════════════════════════ */

(function () {
    'use strict';

    /* ── 메뉴 정의 ───────────────────────────────── */
    const MENUS = [
        { label: '플랜트 모니터링', href: 'main.html', icon: 'layers' },
        { label: '설계 시뮬레이션', href: '#', icon: 'grid' },
        { sep: true },
        { label: '운영 정보', href: 'page-operation.html', icon: 'clipboard' },
        { label: '운영 분석', href: 'page-analysis.html', icon: 'activity' },
        { label: '의사결정 지원', href: 'page-decision.html', icon: 'chat' },
        { label: '진단·고장예지', href: 'page-diagnostics.html', icon: 'alert' },
        { label: '설계 정보·자산 관리', href: 'page-asset.html', icon: 'wrench' },
        { sep: true },
        { label: '환경 설정', href: '#', icon: 'settings' },
        { label: '도움말', href: '#', icon: 'help' },
    ];

    /* ── SVG 아이콘 맵 ─────────────────────────── */
    const ICONS = {
        layers: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>`,
        grid: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.2"/><rect x="14" y="3" width="7" height="7" rx="1.2"/><rect x="14" y="14" width="7" height="7" rx="1.2"/><rect x="3" y="14" width="7" height="7" rx="1.2"/></svg>`,
        clipboard: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 2h6a1 1 0 0 1 1 1v1H8V3a1 1 0 0 1 1-1z"/><rect x="4" y="4" width="16" height="19" rx="2"/><line x1="8" y1="10" x2="16" y2="10"/><line x1="8" y1="14" x2="16" y2="14"/><line x1="8" y1="18" x2="12" y2="18"/></svg>`,
        activity: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>`,
        chat: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`,
        alert: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
        wrench: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>`,
        settings: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`,
        help: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="11"/><path d="M9.5 9a2.5 2.5 0 0 1 4.87.83c0 1.67-2.37 2.5-2.37 3.7"/><circle cx="12" cy="17" r="0.5" fill="currentColor"/></svg>`,
    };

    /* ── 현재 페이지 감지 ────────────────────────── */
    const currentFile = window.location.pathname.split('/').pop() || 'main.html';

    /* ── HTML 빌드 ────────────────────────────────── */
    function buildDockHTML() {
        let items = '';
        MENUS.forEach(m => {
            if (m.sep) { items += '<div class="dock-sep"></div>'; return; }
            const isActive = (currentFile === m.href) ? ' active' : '';
            items += `
            <div class="dock-item${isActive}" data-label="${m.label}" data-href="${m.href}">
                <div class="dock-icon-wrap">${ICONS[m.icon]}</div>
            </div>`;
        });

        return `
        <nav id="dock">
            <div class="dock-inner">
                <img src="main_ci.png" alt="PROMISE" style="height:34px;object-fit:contain;flex-shrink:0;margin-right:6px;">
                <div class="tb-sep"></div>
                ${items}
                <div class="dock-spacer"></div>
                <!-- 페이지별 커스텀 슬롯 (JS로 콘텐츠 삽입) -->
                <div id="dock-slot"></div>
                <div class="dock-right">
                    <span class="dock-runtime" id="dock-runtime">⏱&ensp; 연속 &ensp;<strong id="dock-runtime-current">127</strong> h &emsp;·&emsp; 누적 &ensp;<strong id="dock-runtime-total">1,842</strong> h</span>
                    <span class="tb-weather">🌤 23°C &nbsp;·&nbsp; 맑음 &nbsp;·&nbsp; 습도 62%</span>
                    <span class="tb-clock" id="clock">--:--:--</span>
                    <div class="tb-sep"></div>
                    <button class="icon-btn" title="알림">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4B5563" stroke-width="2" stroke-linecap="round">
                            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                        </svg>
                        <span class="notif-dot"></span>
                    </button>
                    <div class="dock-user" onclick="window.location.href='login.html'" style="cursor:pointer;" title="로그아웃">
                        <div class="avatar">관</div>
                        <div class="dock-user-info">
                            <span class="dock-user-name">홍길동</span>
                            <span class="dock-user-role">관리자</span>
                        </div>
                    </div>
                </div>
            </div>
        </nav>`;
    }

    /* ── CSS (공통 상단바 스타일) ──────────────────── */
    function injectStyles() {
        if (document.getElementById('shared-navbar-css')) return;
        const style = document.createElement('style');
        style.id = 'shared-navbar-css';
        style.textContent = `
        /* ── SHARED DOCK VARIABLES ── */
        :root {
            --c-green:#73CF79;--c-mint:#50B8B8;--c-blue:#3978B8;--c-navy:#1A202D;--c-teal:#5CC196;
            --grad-main:linear-gradient(135deg,#73CF79 0%,#50B8B8 50%,#3978B8 100%);
            --grad-h:linear-gradient(90deg,#73CF79 0%,#50B8B8 50%,#3978B8 100%);
            --bg:#EBF3F5;--border:rgba(80,184,184,0.14);--border-strong:rgba(80,184,184,0.24);
            --text-1:#1A202D;--text-2:#3D5A6A;--text-3:#7A9EAB;
            --accent:#3978B8;--accent-mid:#50B8B8;--accent-lt:rgba(80,184,184,0.10);
            --success:#73CF79;--warning:#F59E0B;--danger:#EF4444;
            --dock-h:84px;
        }

        #dock{position:fixed;top:0;left:0;right:0;height:var(--dock-h);background:rgba(255,255,255,0.25);backdrop-filter:blur(22px);border-bottom:1px solid rgba(80,184,184,0.18);box-shadow:0 4px 24px rgba(0,0,0,0.09),0 0 0 1px rgba(0,0,0,0.04);display:flex;align-items:center;z-index:200;}
        .dock-inner{display:flex;align-items:center;width:100%;padding:0 20px;gap:6px;}
        .dock-spacer{flex:1;}
        .dock-right{display:flex;align-items:center;gap:10px;flex-shrink:0;}
        .dock-item{position:relative;display:flex;flex-direction:column;align-items:center;gap:4px;cursor:pointer;transition:transform 0.18s cubic-bezier(0.34,1.56,0.64,1);padding:0 4px;}
        .dock-item:hover{transform:translateY(9px);}
        .dock-icon-wrap{width:58px;height:58px;border-radius:15px;background:rgba(220,226,230,0.9);display:flex;align-items:center;justify-content:center;color:var(--text-2);transition:all 0.18s;}
        .dock-item.active .dock-icon-wrap{background:var(--grad-main);color:white;box-shadow:0 4px 16px rgba(62,135,194,0.38);}
        .dock-item::before{content:attr(data-label);position:absolute;top:115%;left:50%;transform:translateX(-50%);background:rgba(80,184,184,0.95);color:white;font-size:14px;padding:6px 12px;border-radius:8px;white-space:nowrap;opacity:0;pointer-events:none;transition:opacity 0.15s;z-index:300;}
        .dock-item:hover::before{opacity:1;}
        .dock-sep{width:2px;height:40px;background:var(--border-strong);margin:0 6px;}
        .tb-sep{width:2px;height:40px;background:var(--border-strong);flex-shrink:0;}
        .tb-clock{font-family:'JetBrains Mono',monospace;font-size:16px;font-weight:500;color:var(--text-2);letter-spacing:0.05em;white-space:nowrap;}
        .tb-weather{font-size:15px;color:var(--text-2);background:rgba(0,0,0,0.04);padding:9px 22px;border-radius:100px;white-space:nowrap;flex-shrink:0;}
        .icon-btn{position:relative;background:none;border:none;cursor:pointer;width:46px;height:46px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:22px;transition:background 0.15s;}
        .icon-btn:hover{background:rgba(0,0,0,0.06);}
        .notif-dot{position:absolute;top:8px;right:8px;width:7px;height:7px;background:var(--danger);border-radius:50%;border:2px solid white;}
        .avatar{width:44px;height:44px;border-radius:12px;background:var(--grad-main);display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:700;color:white;cursor:pointer;flex-shrink:0;}
        .dock-user{display:flex;align-items:center;gap:10px;padding:4px 14px 4px 4px;border-radius:14px;transition:background 0.15s;}
        .dock-user:hover{background:rgba(0,0,0,0.04);}
        .dock-user-info{display:flex;flex-direction:column;gap:1px;}
        .dock-user-name{font-size:13px;font-weight:600;color:var(--text-1);line-height:1.2;white-space:nowrap;}
        .dock-user-role{font-size:11px;font-weight:600;color:var(--c-mint);line-height:1.2;white-space:nowrap;}
        .dock-runtime{font-size:15px;color:var(--text-2);background:rgba(0,0,0,0.04);padding:10px 28px;border-radius:100px;white-space:nowrap;flex-shrink:0;display:flex;align-items:center;letter-spacing:0.01em;margin-right:10px;}
        #dock-slot{display:contents;}
        `;
        document.head.appendChild(style);
    }

    /* ── 시계 ─────────────────────────────────────── */
    function startClock() {
        const el = document.getElementById('clock');
        if (!el) return;
        function tick() {
            const d = new Date();
            el.textContent = d.toTimeString().slice(0, 8);
        }
        tick();
        setInterval(tick, 1000);
    }

    /* ── 네비게이션 바인딩 ────────────────────────── */
    function bindNav() {
        document.querySelectorAll('#dock .dock-item').forEach(item => {
            item.addEventListener('click', () => {
                const href = item.dataset.href;
                if (href && href !== '#') {
                    window.location.href = href;
                }
            });
        });
    }

    /* ── 뷰포트 스케일링 (1920×1080 고정) ──────────── */
    function fitViewport() {
        var s = Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
        document.body.style.transform = 'scale(' + s + ')';
    }

    /* ── 초기화 ───────────────────────────────────── */
    function init() {
        injectStyles();
        document.body.insertAdjacentHTML('afterbegin', buildDockHTML());
        startClock();
        bindNav();
        fitViewport();
        window.addEventListener('resize', fitViewport);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
