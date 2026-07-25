// 예약 폼 제출을 받아 solapi로 사무실 휴대폰에 LMS 문자를 발송하는 서버리스 함수
const crypto = require('crypto');

const SOLAPI_ENDPOINT = 'https://api.solapi.com/messages/v4/send';

// solapi HMAC-SHA256 인증 헤더 생성
function authHeader(apiKey, apiSecret) {
  const date = new Date().toISOString();
  const salt = crypto.randomBytes(16).toString('hex');
  const signature = crypto
    .createHmac('sha256', apiSecret)
    .update(date + salt)
    .digest('hex');
  return `HMAC-SHA256 apiKey=${apiKey}, date=${date}, salt=${salt}, signature=${signature}`;
}

// 요청 본문을 안전하게 읽어 JSON으로 파싱
async function readBody(req) {
  if (req.body) {
    return typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  }
  let raw = '';
  for await (const chunk of req) raw += chunk;
  return raw ? JSON.parse(raw) : {};
}

// 숫자만 남겨 전화번호 정규화
const onlyDigits = (s) => String(s || '').replace(/\D/g, '');

// 길이 제한 + 앞뒤 공백 제거
const clip = (s, n) => String(s || '').trim().slice(0, n);

// 인스턴스 생존 동안의 간이 제출 기록(IP별) — 서버리스 특성상 완벽하진 않지만
// 스크립트로 같은 인스턴스에 연타하는 봇의 문자 발송 비용을 막는 1차 방어선
const submitLog = new Map(); // ip -> [timestamp,...]
const WINDOW_MS = 10 * 60 * 1000; // 10분
const MAX_PER_WINDOW = 3; // IP당 10분에 3회

function isRateLimited(ip) {
  const now = Date.now();
  const list = (submitLog.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  if (list.length >= MAX_PER_WINDOW) {
    submitLog.set(ip, list);
    return true;
  }
  list.push(now);
  submitLog.set(ip, list);
  return false;
}

const AREA_LABELS = {
  divorce: '이혼·가사',
  'school-violence': '학교폭력·소년보호',
  criminal: '형사·행정',
  franchise: '가맹·프랜차이즈',
  rehabilitation: '회생·파산',
  etc: '기타',
};

// 유입 경로를 문자에 넣을 한 줄로 요약한다.
// 광고 클릭이면 실제 검색어(n_query)와 입찰 키워드(n_keyword)가 가장 중요한 정보다.
function summarizeAttr(attr) {
  if (!attr || typeof attr !== 'object') return '기록 없음';
  const a = attr.first || attr.current || {};
  const parts = [];

  if (a.n_query) parts.push(`검색어 "${clip(a.n_query, 40)}"`);
  if (a.n_keyword) parts.push(`광고키워드 "${clip(a.n_keyword, 40)}"`);
  if (a.utm_campaign) parts.push(`캠페인 ${clip(a.utm_campaign, 30)}`);

  if (!parts.length) {
    const ref = clip(a.ref, 120);
    if (!ref) parts.push('직접 방문 또는 즐겨찾기');
    else if (/naver/i.test(ref)) parts.push('네이버 (검색·블로그 등)');
    else if (/google/i.test(ref)) parts.push('구글 검색');
    else if (/daum|kakao/i.test(ref)) parts.push('다음·카카오');
    else if (/chatgpt|perplexity|claude|gemini|copilot/i.test(ref)) parts.push('AI 검색');
    else parts.push(ref);
  } else if (a.utm_source || a.n_media) {
    parts.unshift(clip(a.utm_source || a.n_media, 20) + ' 광고');
  }

  if (a.landing) parts.push(`처음 본 페이지 ${clip(a.landing, 60)}`);
  if (a.at) parts.push(`최초 방문 ${clip(a.at, 20)}`);

  // 첫 방문과 신청 시점이 다르면 재방문 후 신청한 것 — 검토 기간이 있었다는 뜻
  const cur = attr.current || {};
  if (a.at && cur.at && a.at.slice(0, 10) !== cur.at.slice(0, 10)) {
    parts.push('※ 다른 날 다시 방문해 신청');
  }
  return parts.join(' · ');
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }

  // 외부 봇의 직접 호출 차단 — 브라우저 fetch POST는 항상 Origin을 보내므로
  // origin/referer가 아예 없는 요청(curl 등 스크립트)도 차단한다
  const origin = req.headers.origin || req.headers.referer || '';
  if (!/chang-hee\.kim|localhost|127\.0\.0\.1/i.test(origin)) {
    return res.status(403).json({ ok: false, error: 'forbidden' });
  }

  // IP당 반복 제출 제한(문자 발송 비용 방어)
  const ip = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '')
    .split(',')[0]
    .trim();
  if (isRateLimited(ip)) {
    return res.status(429).json({ ok: false, error: 'too_many_requests' });
  }

  let body;
  try {
    body = await readBody(req);
  } catch (e) {
    return res.status(400).json({ ok: false, error: 'bad_request' });
  }

  // 허니팟: 사람 눈에 안 보이는 필드가 채워졌으면 봇으로 간주하고 조용히 성공 응답
  if (body.company) {
    return res.status(200).json({ ok: true });
  }

  const name = clip(body.name, 30);
  const phone = onlyDigits(body.phone).slice(0, 11);
  const area = AREA_LABELS[body.area] || '미선택';
  const time = clip(body.time, 30);
  const content = clip(body.content, 800);

  // 필수값 검증
  if (name.length < 2 || phone.length < 10 || content.length < 5) {
    return res.status(400).json({ ok: false, error: 'invalid_input' });
  }

  const apiKey = (process.env.SOLAPI_API_KEY || '').trim();
  const apiSecret = (process.env.SOLAPI_API_SECRET || '').trim();
  // solapi에 사전등록된 발신번호 (등록번호 변경 시 이 값만 수정)
  const from = '01026085099';
  const to = onlyDigits(process.env.RESERVE_TO) || '01089974452';

  if (!apiKey || !apiSecret) {
    console.error('solapi 환경변수(SOLAPI_API_KEY/SECRET) 미설정');
    return res.status(500).json({ ok: false, error: 'server_misconfigured' });
  }

  const text =
    '[홈페이지 상담예약]\n' +
    `■ 이름: ${name}\n` +
    `■ 연락처: ${body.phone}\n` +
    `■ 분야: ${area}\n` +
    `■ 희망 연락시간: ${time || '미입력'}\n` +
    '■ 상담내용\n' +
    content +
    '\n\n■ 유입경로\n' +
    summarizeAttr(body.attr);

  try {
    const r = await fetch(SOLAPI_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: authHeader(apiKey, apiSecret),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: { to, from, text, subject: '홈페이지 상담예약', type: 'LMS' },
      }),
    });

    const data = await r.json().catch(() => ({}));

    if (!r.ok) {
      console.error('solapi 발송 실패', r.status, data);
      return res.status(502).json({ ok: false, error: 'send_failed' });
    }

    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('solapi 호출 예외', e);
    return res.status(502).json({ ok: false, error: 'send_failed' });
  }
};
