/* ═══════════════════════════════════════════════════════════════
   PROMISE DT — Version (version.js)
   ─────────────────────────────────────────────────────────────
   모든 페이지에서 버전 정보를 단일 소스로 관리.
   사용법: <script src="../scripts/version.js"></script>

   페이지 내 버전 표시 요소:
   - <title> 태그 내 {VERSION} 또는 기존 vX.X 패턴 자동 치환
   - [data-version] 속성을 가진 요소에 버전 텍스트 삽입
═══════════════════════════════════════════════════════════════ */

(function () {
    'use strict';

    const VERSION = '1.3.1';

    // <title> 태그 내 버전 업데이트
    if (document.title) {
        document.title = document.title.replace(/v[\d.]+/, 'v' + VERSION);
    }

    // [data-version] 요소에 버전 삽입
    document.querySelectorAll('[data-version]').forEach(function (el) {
        el.textContent = el.dataset.version === 'full'
            ? 'PROMISE DT v' + VERSION
            : 'v' + VERSION;
    });

    // 전역 접근용
    window.PROMISE_VERSION = VERSION;
})();
