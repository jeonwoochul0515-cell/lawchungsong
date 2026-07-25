// 방문자가 처음 사이트에 들어온 경로(광고 키워드·검색어·유입처)를 저장해 상담 신청 시 함께 보내는 스크립트
(function () {
    'use strict';

    var KEY = 'cs_attr';           // 첫 방문 정보 (한 번 저장하면 덮어쓰지 않음)
    var LAST_KEY = 'cs_attr_last'; // 마지막 방문 정보 (재방문 경로 파악용)

    // 네이버 검색광고 자동추적 파라미터 + 일반 UTM + 구글/메타 클릭 ID
    var TRACK_PARAMS = [
        'n_query',        // 실제 검색한 말 — 가장 중요
        'n_keyword',      // 입찰한 키워드
        'n_keyword_id',
        'n_ad_group',
        'n_campaign_type',
        'n_media',
        'n_rank',
        'n_ad',
        'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
        'gclid', 'fbclid'
    ];

    function collect() {
        var params = new URLSearchParams(location.search);
        var data = {};
        for (var i = 0; i < TRACK_PARAMS.length; i++) {
            var v = params.get(TRACK_PARAMS[i]);
            if (v) data[TRACK_PARAMS[i]] = String(v).slice(0, 100);
        }
        data.ref = (document.referrer || '').slice(0, 200);
        data.landing = (location.pathname + location.search).slice(0, 200);
        data.at = new Date().toISOString().slice(0, 16).replace('T', ' ');
        return data;
    }

    function save() {
        var now;
        try {
            now = collect();
            // 광고 파라미터도 없고 외부 유입도 아니면(직접 방문·내부 이동) 기록할 가치가 없다
            var hasSignal = Object.keys(now).some(function (k) {
                return k !== 'ref' && k !== 'landing' && k !== 'at';
            });
            var external = now.ref && now.ref.indexOf(location.hostname) === -1;
            if (!hasSignal && !external && localStorage.getItem(KEY)) return;

            localStorage.setItem(LAST_KEY, JSON.stringify(now));
            if (!localStorage.getItem(KEY)) localStorage.setItem(KEY, JSON.stringify(now));
        } catch (e) {
            // 시크릿 모드 등 저장소 차단 시 조용히 포기 — 상담 신청 자체는 막지 않는다
        }
    }

    // 상담 폼에서 호출해 서버로 보낼 유입 정보를 얻는다
    window.getAttribution = function () {
        var out = {};
        try {
            var first = localStorage.getItem(KEY);
            var last = localStorage.getItem(LAST_KEY);
            if (first) out.first = JSON.parse(first);
            if (last) out.last = JSON.parse(last);
            out.current = collect();
        } catch (e) { /* 저장소 접근 불가 시 빈 값 */ }
        return out;
    };

    save();
})();
