// 예약 폼 제출을 받아 solapi로 사무실 휴대폰에 LMS 문자를 발송하는 서버리스 함수
const crypto = require('crypto');

const SOLAPI_ENDPOINT = 'https://api.solapi.com/messages/v4/send';

// solapi HMAC-SHA256 인증 헤더 생성
function authHeader(apiKey, apiSecret) {
  const date = new Date().toISOString();
  const salt = crypto.randomBytes(32).toString('hex');
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

const AREA_LABELS = {
  divorce: '이혼·가사',
  'school-violence': '학교폭력·소년보호',
  criminal: '형사·행정',
  franchise: '가맹·프랜차이즈',
  rehabilitation: '회생·파산',
  etc: '기타',
};

module.exports = async (req, res) => {
  // 임시 진단: 값 노출 없이 환경변수 존재 여부만 확인 (확인 후 제거 예정)
  if (req.method === 'GET' && /[?&]diag=1/.test(req.url || '')) {
    return res.status(200).json({
      hasKey: !!process.env.SOLAPI_API_KEY,
      hasSecret: !!process.env.SOLAPI_API_SECRET,
      hasSender: !!process.env.SOLAPI_SENDER,
      hasTo: !!process.env.RESERVE_TO,
    });
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }

  // 외부 봇의 직접 호출 차단(같은 도메인에서 온 요청만 허용, 테스트 환경은 통과)
  const origin = req.headers.origin || req.headers.referer || '';
  if (origin && !/chang-hee\.kim|localhost|127\.0\.0\.1/i.test(origin)) {
    return res.status(403).json({ ok: false, error: 'forbidden' });
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

  const apiKey = process.env.SOLAPI_API_KEY;
  const apiSecret = process.env.SOLAPI_API_SECRET;
  const from = onlyDigits(process.env.SOLAPI_SENDER) || '16604452';
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
    content;

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
      // 임시 진단: solapi 오류 사유 노출 (확인 후 제거 예정)
      return res.status(502).json({ ok: false, error: 'send_failed', status: r.status, detail: data });
    }

    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('solapi 호출 예외', e);
    return res.status(502).json({ ok: false, error: 'send_failed' });
  }
};
