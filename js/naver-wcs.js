// 네이버 프리미엄 로그분석·광고 전환 추적(신 스크립트 wcs.trans) — 모든 공개 페이지에서 페이지 조회를 보내고 상담 접수·전화·카톡 전환을 보낸다
(function () {
    'use strict';

    var WA = 's_6875d9c1c1f';      // 네이버 공통키(광고주센터 → 도구 → 프리미엄 로그분석, 화면 원본 그대로)
    var DOMAIN = 'chang-hee.kim';  // wcs.inflow 쿠키 도메인(루트 도메인)
    // 전환 유형 — call·inquiry는 광고보고서에 안 나와서(공식 문서 2.4.2) 전화·카톡은 사용자정의 1·2번으로 보낸다
    var TYPES = { lead: 'lead', call: 'custom001', kakao: 'custom002' };

    var ready = false;
    var queue = [];

    function send(type) {
        try {
            var _conv = {};
            _conv.type = type;
            window.wcs.trans(_conv);
        } catch (e) { /* 전송 실패가 화면을 막지 않게 한다 */ }
    }

    // 전환 1건. 개인정보·금액은 넣지 않는다. 스크립트가 아직 안 떴으면 뜬 뒤에 보낸다.
    window.naverConv = function (kind) {
        var type = TYPES[kind];
        if (!type) return;
        if (ready) send(type); else queue.push(type);
    };

    var s = document.createElement('script');
    s.src = 'https://wcs.naver.net/wcslog.js';
    s.async = true;
    s.onload = function () {
        if (!window.wcs) return;
        try {
            window.wcs_add = window.wcs_add || {};
            window.wcs_add['wa'] = WA;
            window.wcs.inflow(DOMAIN);
            window.wcs_do(); // 페이지 조회
            ready = true;
            while (queue.length) send(queue.shift());
        } catch (e) { /* 차단기 등으로 실패해도 사이트 동작에는 영향 없음 */ }
    };
    (document.head || document.documentElement).appendChild(s);

    // 전화·카카오톡 링크 클릭(사이트 전체, 위임 방식)
    document.addEventListener('click', function (e) {
        var link = e.target.closest && e.target.closest('a');
        if (!link) return;
        var href = link.getAttribute('href') || '';
        if (href.indexOf('tel:') === 0) window.naverConv('call');
        else if (href.indexOf('pf.kakao.com') !== -1 || href.indexOf('open.kakao.com') !== -1) window.naverConv('kakao');
    });
})();
