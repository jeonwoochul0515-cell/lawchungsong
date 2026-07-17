// 주간 칼럼 주제 파이프라인 — 검색량(검색광고API)+뉴스(검색API)로 다음 칼럼 주제 후보를 뽑아 리포트 생성
// 실행: npm run topics  → scripts/reports/topics-YYYY-MM-DD.md
const fs = require('fs');
const path = require('path');
const { search, keywordTool, stripTags, qcNum, sleep } = require('./naver-api');

// 분야별 시드 키워드(각 배열 = 키워드도구 1회 호출, 최대 5개)
const FIELDS = {
  '이혼·가사': [['이혼절차', '재산분할', '양육비', '상간소송', '사실혼']],
  '학교폭력·소년': [['학폭위', '학교폭력', '촉법소년', '소년재판', '교권보호위원회']],
  '형사·피해자': [['형사고소', '명예훼손', '스토킹처벌법', '접근금지신청', '무고죄']],
  '가맹·프랜차이즈': [['가맹계약해지', '정보공개서', '가맹금반환', '가맹사업법', '가맹점분쟁']],
  '회생·파산': [['개인회생', '부산개인회생', '개인파산', '개인회생신청자격', '채무조정']],
};

// 분야별 뉴스 질의(최신 이슈 소재)
const NEWS_QUERIES = {
  '이혼·가사': ['양육비 미지급', '재산분할 판결'],
  '학교폭력·소년': ['학교폭력 처분', '촉법소년 법개정'],
  '형사·피해자': ['스토킹처벌법', '피해자 보호명령'],
  '가맹·프랜차이즈': ['가맹사업법 개정', '가맹본부 분쟁'],
  '회생·파산': ['개인회생 제도', '채무조정'],
};

// 법률 관련 키워드만 남기는 필터(비법률 노이즈 제거)
const LEGAL_RE = /(변호사|이혼|양육|친권|재산분할|상간|사실혼|학폭|학교폭력|촉법|소년|보호처분|교권|형사|고소|고발|합의|처벌|기소|명예훼손|무고|스토킹|접근금지|가정폭력|피해자|성범죄|통매음|가맹|프랜차이즈|정보공개서|회생|파산|채무|워크아웃|빚|법원|소송|법률|위자료|협의이혼|보이스피싱)/;
// 타 지역 키워드 제외(부산 사무소와 무관한 유입)
const OTHER_REGION_RE = /(서울|대구|인천|수원|대전|광주|울산|창원|제주|청주|안산|부천|남양주|의정부|성남|고양|용인|천안|전주|포항|일산|분당|강남|송파|노원)/;
// 표에 올릴 최소 월 검색량(이 밑은 써봤자 유입이 없음)
const MIN_VOLUME = 300;

(async () => {
  const today = new Date().toISOString().slice(0, 10);
  const existing = JSON.parse(
    fs.readFileSync(path.join(__dirname, '..', 'columns', 'index.json'), 'utf8')
  );
  const existingText = existing.map((c) => c.title + c.summary).join('\n');

  let md = `# 칼럼 주제 후보 리포트 — ${today}\n\n`;
  md += `> 검색광고 API(월간 검색량·경쟁도) + 뉴스 API(최신 이슈) 자동 수집.\n`;
  md += `> "경쟁 낮음·중간 + 검색량"이 붙은 키워드가 1순위 후보. 기존 칼럼 ${existing.length}편과 겹침 여부 참고.\n\n`;

  for (const [field, batches] of Object.entries(FIELDS)) {
    const seen = new Set();
    const rows = [];
    for (const b of batches) {
      for (const k of await keywordTool(b)) {
        if (seen.has(k.relKeyword)) continue;
        seen.add(k.relKeyword);
        if (!LEGAL_RE.test(k.relKeyword)) continue;
        if (OTHER_REGION_RE.test(k.relKeyword)) continue;
        rows.push({
          kw: k.relKeyword,
          total: qcNum(k.monthlyPcQcCnt) + qcNum(k.monthlyMobileQcCnt),
          comp: k.compIdx,
        });
      }
      await sleep(300);
    }
    // 우선순위: 경쟁 낮음/중간 먼저, 그 안에서 검색량순 → 다음 경쟁 높음 검색량순
    // 단 최소 검색량 미달은 제외(써봤자 유입 없음)
    const rank = { 낮음: 0, 중간: 1, 높음: 2 };
    const filtered = rows.filter((r) => r.total >= MIN_VOLUME);
    filtered.sort((a, b) => rank[a.comp] - rank[b.comp] || b.total - a.total);
    rows.length = 0;
    rows.push(...filtered);

    md += `## ${field}\n\n### 키워드 후보 (경쟁 낮은 순 → 검색량 순)\n\n`;
    md += `| 키워드 | 월 검색량 | 경쟁 | 기존 칼럼 겹침 |\n|---|---|---|---|\n`;
    for (const r of rows.slice(0, 15)) {
      const dup = existingText.includes(r.kw.replace(/부산/, '')) ? '유사 있음' : '';
      md += `| ${r.kw} | ${r.total.toLocaleString()} | ${r.comp} | ${dup} |\n`;
    }

    md += `\n### 최신 뉴스 이슈 (칼럼 소재)\n\n`;
    for (const q of NEWS_QUERIES[field]) {
      const news = await search('news', q, 5, 'date');
      md += `**${q}**\n`;
      for (const it of news.items) {
        const d = new Date(it.pubDate);
        const age = (Date.now() - d) / 86400000;
        if (age > 21) continue; // 3주 이상 지난 뉴스 제외
        md += `- ${stripTags(it.title)} (${d.toISOString().slice(0, 10)})\n`;
      }
      md += `\n`;
      await sleep(150);
    }
  }

  md += `---\n\n**활용법.** 표에서 "경쟁 낮음·중간"인데 월 검색량이 1,000 이상인 키워드를 골라, 뉴스 이슈와 엮어 "부산 + 구체 상황형" 제목으로 쓴다. 예: 키워드 "교권보호위원회" + 뉴스 "교권 침해 조치 강화" → "교권보호위원회에 넘겨졌다는 통지를 받았다면".\n`;

  const outDir = path.join(__dirname, 'reports');
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, `topics-${today}.md`);
  fs.writeFileSync(outPath, md);
  console.log('리포트 생성:', outPath);
})();
