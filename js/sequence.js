// 스크롤 시퀀스 — 스크롤 위치에 맞춰 낱장 webp 프레임을 세운다.
//
// 왜 <video>가 아닌가: currentTime을 밀어도 키프레임 단위로 튀고, iOS는 사용자 제스처 없이
// seek이 막힌다. 프레임을 낱장으로 깔면 스크롤 좌표 → 프레임 인덱스가 1:1로 떨어진다.
//
// 비용 원칙 — 프레임은 첫 화면 자산이 아니다.
// ① 섹션이 뷰포트에 가까워지기 전에는 단 한 장도 받지 않는다.
// ② 화면 폭에 맞는 변형(w/m)만 받는다. 모바일에 데스크톱 프레임을 내리지 않는다.
// ③ 전부 받기 전에는 정지 이미지 그대로 둔다. 반쯤 받은 상태로 재생하면 스크롤이 끊겨 보인다.
// ④ 받기에 실패하면 조용히 정지 이미지로 남는다. 화면이 깨지는 쪽보다 낫다.
(function () {
    'use strict';

    var track = document.getElementById('journeySeq');
    var frame = document.getElementById('journeySeqFrame');
    if (!track || !frame) return;

    // 모션을 줄여 달라고 설정한 사용자에게 스크롤 연동 재생을 강요하지 않는다.
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce || !('IntersectionObserver' in window)) return;

    var scene = track.getAttribute('data-seq');
    var variant = window.matchMedia('(min-width: 768px)').matches ? 'w' : 'm';
    var images = [];
    var ready = false;
    var ticking = false;
    var current = -1;

    function pad(n) {
        return n < 10 ? '00' + n : n < 100 ? '0' + n : '' + n;
    }

    function draw() {
        ticking = false;
        if (!ready) return;
        var r = track.getBoundingClientRect();
        var span = r.height - window.innerHeight;
        if (span <= 0) return;
        // 트랙 상단이 화면 위로 올라간 거리 / 스크롤 가능한 총 거리
        var p = Math.min(1, Math.max(0, -r.top / span));
        var i = Math.min(images.length - 1, Math.round(p * (images.length - 1)));
        if (i === current) return;
        current = i;
        frame.src = images[i].src;
    }

    function onScroll() {
        if (ticking) return;
        ticking = true;
        window.requestAnimationFrame(draw);
    }

    function preload(pattern, count) {
        var left = count;
        var failed = false;
        for (var i = 1; i <= count; i++) {
            var img = new Image();
            img.decoding = 'async';
            img.onload = function () {
                if (--left === 0 && !failed) {
                    ready = true;
                    window.addEventListener('scroll', onScroll, { passive: true });
                    window.addEventListener('resize', onScroll, { passive: true });
                    draw();
                }
            };
            img.onerror = function () {
                failed = true; // 한 장이라도 실패하면 정지 이미지로 남긴다
            };
            img.src = pattern.replace('%03d', pad(i));
            images.push(img);
        }
    }

    function start() {
        fetch('/images/pear/seq/manifest.json')
            .then(function (r) {
                return r.ok ? r.json() : null;
            })
            .then(function (m) {
                if (!m || !m.scenes) return;
                var s = null;
                for (var i = 0; i < m.scenes.length; i++) {
                    if (m.scenes[i].name === scene) s = m.scenes[i];
                }
                if (!s || !s.variants || !s.variants[variant]) return;
                var v = s.variants[variant];
                preload(v.pattern, v.frames);
            })
            .catch(function () { /* 정지 이미지 유지 */ });
    }

    // 섹션이 한 화면 앞까지 다가왔을 때 받기 시작한다.
    var io = new IntersectionObserver(function (entries) {
        for (var i = 0; i < entries.length; i++) {
            if (entries[i].isIntersecting) {
                io.disconnect();
                start();
                return;
            }
        }
    }, { rootMargin: '100% 0px' });
    io.observe(track);
})();
