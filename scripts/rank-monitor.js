// 키워드 순위 모니터링 — 검색 API로 타깃 키워드에서 우리 도메인(웹문서·블로그) 순위를 기록·비교
// 실행: npm run ranks  → scripts/reports/rank-history.json 누적 + 콘솔 표 출력
const fs = require('fs');
const path = require('path');
const { search, sleep } = require('./naver-api');

const OURS = /chang-hee\.kim|blog\.naver\.com\/lawchungsong/;

// 타깃 키워드 (브랜드 / 지역 / 상황형 롱테일)
const KEYWORDS = [
  // 브랜드
  '김창희 변호사', '법률사무소 청송', '부산 김창희 변호사',
  // 지역 × 분야
  '부산 이혼 변호사', '부산 학교폭력 변호사', '부산 형사 변호사',
  '부산 가맹점 분쟁 변호사', '부산 개인회생 변호사', '부산 양육비 변호사',
  '부산 스토킹 변호사', '부산 여성 변호사', '부산 연제구 변호사',
  // 상황형 롱테일(칼럼 타깃)
  '학폭위 출석 통지서', '학교폭력 기록 삭제', '촉법소년 나이',
  '양육비 미지급 대응', '양육비 이행명령', '접근금지신청 방법',
  '피해자보호명령 절차', '협의이혼 절차 서류', '상간소송 위자료',
  '가맹계약 해지 위약금', '정보공개서 확인', '개인회생 신청자격 부산',
  '교권보호위원회 대응',
];

function findRank(items) {
  for (let i = 0; i < items.length; i++) {
    if (OURS.test(items[i].link || '')) return { rank: i + 1, link: items[i].link };
  }
  return null;
}

(async () => {
  const today = new Date().toISOString().slice(0, 10);
  const outDir = path.join(__dirname, 'reports');
  fs.mkdirSync(outDir, { recursive: true });
  const histPath = path.join(outDir, 'rank-history.json');
  const history = fs.existsSync(histPath) ? JSON.parse(fs.readFileSync(histPath, 'utf8')) : {};
  const prevDates = Object.keys(history).sort();
  const prev = prevDates.length ? history[prevDates[prevDates.length - 1]] : {};

  const snapshot = {};
  console.log(`\n순위 점검 ${today} (웹문서 상위 30 기준, ()는 지난 기록 대비)\n`);
  console.log('키워드'.padEnd(24) + '웹문서\t블로그');
  for (const kw of KEYWORDS) {
    const web = findRank((await search('webkr', kw, 30)).items);
    await sleep(120);
    const blog = findRank((await search('blog', kw, 30)).items);
    await sleep(120);
    snapshot[kw] = { web: web?.rank ?? null, blog: blog?.rank ?? null, link: web?.link ?? null };

    const delta = (cur, before) => {
      if (cur == null) return '—';
      if (before == null) return `${cur}위 (신규)`;
      const d = before - cur;
      return `${cur}위 (${d > 0 ? '▲' + d : d < 0 ? '▼' + -d : '='})`;
    };
    console.log(
      kw.padEnd(24) + delta(snapshot[kw].web, prev[kw]?.web) + '\t' + delta(snapshot[kw].blog, prev[kw]?.blog)
    );
  }

  history[today] = snapshot;
  fs.writeFileSync(histPath, JSON.stringify(history, null, 2));
  const inTop30 = Object.values(snapshot).filter((s) => s.web).length;
  console.log(`\n웹문서 30위 내 노출: ${inTop30}/${KEYWORDS.length}개 키워드. 기록: ${histPath}`);
})();
