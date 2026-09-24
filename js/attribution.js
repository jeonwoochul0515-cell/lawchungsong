// 방문자가 처음 사이트에 들어온 경로(광고 키워드·검색어·유입처)를 저장해 상담 신청 시 함께 보내는 스크립트
(function () {
    'use strict';

    var KEY = 'cs_attr';           // 첫 방문 정보 (한 번 저장하면 덮어쓰지 않음)
    var LAST_KEY = 'cs_attr_last'; // 마지막 방문 정보 (재방문 경로 파악용)
    var VID_KEY = 'cs_vid';        // 방문자 식별자 — 행동 기록(visits)과 접수(leads)를 이어준다

    // 방문자 식별자. 개인을 특정하지 않는 무작위 값이고, 같은 브라우저의 방문을 묶어
    // "이 검색어로 온 사람이 어디까지 읽고 접수를 했는가"를 세는 데만 쓴다.
    function visitorId() {
        try {
            var v = localStorage.getItem(VID_KEY);
            if (v) return v;
            var a = new Uint8Array(12);
            (window.crypto || window.msCrypto).getRandomValues(a);
            v = Array.prototype.map.call(a, function (b) { return ('0' + b.toString(16)).slice(-2); }).join('');
            localStorage.setItem(VID_KEY, v);
            return v;
        } catch (e) { return ''; }
    }

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

    // 이 브라우저의 몇 번째 방문인가 — 브라우저 세션(탭 묶음)마다 한 번만 1씩 올린다
    var VISIT_KEY = 'cs_visit_no';
    var VISIT_FLAG = 'cs_visit_counted';
    function countVisit() {
        try {
            var n = parseInt(localStorage.getItem(VISIT_KEY) || '0', 10) || 0;
            if (!sessionStorage.getItem(VISIT_FLAG)) {
                n += 1;
                localStorage.setItem(VISIT_KEY, String(n));
                sessionStorage.setItem(VISIT_FLAG, '1');
            }
        } catch (e) { /* 저장소 차단 시 방문 수는 비워 둔다 */ }
    }

    // 상담 폼에서 호출해 서버로 보낼 유입 정보를 얻는다
    window.getAttribution = function () {
        var out = {};
        try {
            var visitNo = parseInt(localStorage.getItem(VISIT_KEY) || '0', 10);
            if (visitNo > 0) out.visitNo = visitNo;
            var first = localStorage.getItem(KEY);
            var last = localStorage.getItem(LAST_KEY);
            if (first) out.first = JSON.parse(first);
            if (last) out.last = JSON.parse(last);
            out.current = collect();
            out.vid = visitorId();
        } catch (e) { /* 저장소 접근 불가 시 빈 값 */ }
        return out;
    };
    window.getVisitorId = visitorId;

    save();
    countVisit();
})();
