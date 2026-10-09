// 서버 함수 공통 방어 — 요청 출처(Origin) 정확 일치 검사와 손님 IP 추출
const SITE_ORIGIN = 'https://chang-hee.kim';

// 운영 주소와 정확히 같아야 통과. Origin이 없으면 거부.
// 로컬 개발 주소는 DEV_ORIGINS 환경변수(쉼표 구분, 예: http://localhost:3000)로만 추가한다.
function originAllowed(origin) {
  if (!origin) return false;
  if (origin === SITE_ORIGIN) return true;
  return String(process.env.DEV_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .includes(origin);
}

// 손님 IP — Vercel이 넣는 x-real-ip / x-vercel-forwarded-for만 쓴다.
// 손님이 바꿀 수 있는 X-Forwarded-For 첫 값은 믿지 않는다.
function clientIp(req) {
  return (
    String(req.headers['x-real-ip'] || req.headers['x-vercel-forwarded-for'] || '')
      .split(',')[0]
      .trim() || 'unknown'
  );
}

module.exports = { originAllowed, clientIp };
