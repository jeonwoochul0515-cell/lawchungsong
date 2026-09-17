// 행동 비콘 — 페이지를 떠날 때 한 번, "읽고 떠났나 / 행동했나"를 접수함에 남긴다.
//
// 왜 필요한가. 광고로 온 사람의 84%가 양식·작성법을 찾는 말로 들어오는데, 그중 누가 손님이고
// 누가 양식만 받아 가는 사람인지 접수함만 봐서는 알 수 없다 — 체리피커는 접수를 안 한다.
// 그래서 접수 이전 단계에서 신호를 잡는다. 개인을 식별하지 않고, 검색어 단위로만 센다.
//
// 보내는 것: 방문자ID(무작위)·검색어·랜딩·체류시간·스크롤 깊이·CTA 도달·챗봇 열음·전화/예약 누름
(function () {
    'use strict';
    if (!('sendBeacon' in navigator)) return;

    var ENDPOINT = 'https://lead-inbox.jeonwoochul0515.workers.dev/api/visit';
    var SITE = '청송 홈페이지';
    var t0 = Date.now();
    var sent = false;
    var s = { scroll: 0, cta: 0, chat: 0, call: 0, reserve: 0 };

    // 스크롤 깊이(%) — 최대치만 기록
    function onScroll() {
        var h = document.documentElement;
        var max = h.scrollHeight - h.clientHeight;
        if (max <= 0) { s.scroll = 100; return; }
        var pct = Math.round(((window.scrollY || h.scrollTop) / max) * 100);
        if (pct > s.scroll) s.scroll = Math.min(100, pct);
    }

    // CTA 블록(전화·예약 버튼이 있는 영역)이 화면에 들어왔나
    //
    // `text-white`까지 붙여 좋히는 이유 — 예전에는 `.bg-navy.rounded-2xl`만 봤는데,
    // index.html의 업무분야 섹션에 있는 작은 아이콘 사각형(w-16 h-16 bg-navy rounded-2xl)이
    // 문서 순서상 먼저 잡혔다. 그러면 페이지 중간을 지나기만 해도 "CTA 도달"이 찍혀
    // 도달률이 실제보다 부풀려 기록된다. 칼럼 페이지의 상담 블록은 text-white를 갖고,
    // index.html은 #booking으로 잡힐다.
    function watchCta() {
        var cta = document.querySelector('.bg-navy.text-white.rounded-2xl, #contact, #booking');
        if (!cta || !('IntersectionObserver' in window)) return;
        var io = new IntersectionObserver(function (es) {
            es.forEach(function (e) { if (e.isIntersecting) { s.cta = 1; io.disconnect(); } });
        }, { threshold: 0.3 });
        io.observe(cta);
    }

    // 클릭 신호 — 전화·예약·챗봇
    function onClick(e) {
        var a = e.target && e.target.closest ? e.target.closest('a,button') : null;
        if (!a) return;
        var href = (a.getAttribute('href') || '');
        if (href.indexOf('tel:') === 0) s.call = 1;
        else if (/reserve|booking/.test(href)) s.reserve = 1;
        else if (a.classList && (a.classList.contains('dain-launcher') || a.classList.contains('dain-cta--primary'))) s.chat = 1;
    }

    function payload() {
        var attr = (typeof window.getAttribution === 'function') ? window.getAttribution() : {};
        var f = attr.first || attr.current || {};
        return {
            site: SITE,
            vid: attr.vid || (typeof window.getVisitorId === 'function' ? window.getVisitorId() : ''),
            query: (f.n_query || f.n_keyword || '').slice(0, 80),
            keyword: (f.n_keyword || '').slice(0, 80),
            media: (f.n_media || f.utm_source || '').slice(0, 20),
            landing: (f.landing || '').split('?')[0].slice(0, 120),
            path: location.pathname.slice(0, 120),
            dwell: Math.min(3600, Math.round((Date.now() - t0) / 1000)),
            scroll: s.scroll,
            cta: s.cta,
            chat: s.chat,
            call: s.call,
            reserve: s.reserve,
        };
    }

    function send() {
        if (sent) return;
        sent = true;
        try {
            var p = payload();
            // 아무 신호도 없는 3초 미만 이탈은 봇·오클릭 가능성이 높아 보내지 않는다
            if (p.dwell < 3 && !p.scroll && !p.cta && !p.chat && !p.call && !p.reserve) return;
            navigator.sendBeacon(ENDPOINT, new Blob([JSON.stringify(p)], { type: 'text/plain' }));
        } catch (e) { /* 실패해도 화면에 영향 없음 */ }
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    document.addEventListener('click', onClick, true);
    window.addEventListener('pagehide', send);
    document.addEventListener('visibilitychange', function () {
        if (document.visibilityState === 'hidden') send();
    });
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', watchCta);
    else watchCta();
})();
