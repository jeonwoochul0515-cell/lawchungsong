// 로캐디(law-caddy) 판례 검색 엔진 연결 — 판례 41만·법령 25만 건이 적재된 Supabase(pgvector+FTS)를
// 서버에서 직접 조회한다. 읽기 전용 anon 키만 쓰며 쓰기는 하지 않는다.
// 정본: hakpok119/functions/src/hyeran/lawcaddy.ts (학교폭력 전용) → 청송 종합 분야로 사전만 교체.
//
// 검색은 두 단계로 내려간다.
//   ① 하이브리드(의미+키워드) — Voyage 임베딩이 되면. 표현이 달라도 사실관계가 닮은 판례를 찾는다.
//   ② 전문검색(FTS)만 — 임베딩이 실패하면 자동 강등. 키가 죽어도 대화는 멈추지 않는다.
// ⚠ 질의 임베딩 모델은 반드시 voyage-3다. 로캐디 DB가 그 모델로 색인돼 있어 다른 모델을 쓰면
//    같은 1024차원이라도 좌표계가 어긋난다.

const SUPA_URL = () => (process.env.LAWCADDY_SUPABASE_URL || '').trim().replace(/\/$/, '');
const SUPA_KEY = () => (process.env.LAWCADDY_SUPABASE_KEY || '').trim();

// DB에는 lbox_39528·kb_prec_177324 같은 내부 식별자가 섞여 있다. 그대로 인용하면
// 존재하지 않는 판례를 대는 꼴이 되므로 실제 사건번호 형태만 인용 가능으로 표시한다.
const REAL_CASE_NO = /((?:19|20)\d{2}[가-힣]{1,4}\d+)/;

function headers() {
  const k = SUPA_KEY();
  return { apikey: k, Authorization: 'Bearer ' + k };
}

async function rest(path, timeoutMs) {
  const url = SUPA_URL();
  if (!url || !SUPA_KEY()) return [];
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), timeoutMs || 4000);
  try {
    const res = await fetch(url + path, { headers: headers(), signal: ac.signal });
    if (!res.ok) return [];
    const body = await res.json();
    return Array.isArray(body) ? body : [];
  } catch {
    return [];
  } finally {
    clearTimeout(t);
  }
}

/** 로캐디 DB와 같은 모델(voyage-3)로 질의를 임베딩한다. 실패하면 null → 키워드 검색으로 강등 */
async function embedQuery(text) {
  const key = (process.env.VOYAGE_API_KEY || '').trim();
  if (!key) return null;
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), 4000);
  try {
    const res = await fetch('https://api.voyageai.com/v1/embeddings', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: [text.slice(0, 2000)], model: 'voyage-3', input_type: 'query' }),
      signal: ac.signal,
    });
    if (!res.ok) return null;
    const j = await res.json();
    return (j.data && j.data[0] && j.data[0].embedding) || null;
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

/** 하이브리드 검색 RPC — 의미(벡터)와 키워드(FTS) 점수를 가중합해 정렬한다 */
async function hybridRpc(rpc, params) {
  const url = SUPA_URL();
  if (!url || !SUPA_KEY()) return [];
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), 5000);
  try {
    const res = await fetch(url + '/rest/v1/rpc/' + rpc, {
      method: 'POST',
      headers: Object.assign({}, headers(), { 'Content-Type': 'application/json' }),
      body: JSON.stringify(params),
      signal: ac.signal,
    });
    if (!res.ok) return [];
    const body = await res.json();
    return Array.isArray(body) ? body : [];
  } catch {
    return [];
  } finally {
    clearTimeout(t);
  }
}

// ── 도메인 사전 — 여기만 사이트별로 갈아끼운다 ────────────────────────────────
// 청송은 분야가 넓어 학폭119처럼 앵커를 하나로 둘 수 없다. 대화에서 분야를 먼저 골라
// 그 분야의 앵커·용어로 검색한다. 앞쪽 분야가 더 강한 신호(먼저 채택).
const DOMAINS = [
  {
    key: '학교폭력',
    anchor: '학교폭력',
    cues: ['학폭', '학교폭력', '심의위원회', '전학', '서면사과', '출석정지', '가해학생', '피해학생', '따돌림', '촉법소년', '보호처분'],
    terms: ['전학', '출석정지', '서면사과', '학급교체', '특별교육', '접촉금지', '심의위원회', '행정심판', '재량권', '생활기록부', '따돌림', '사이버폭력', '보호처분', '촉법소년'],
    relevance: ['학교폭력', '심의위원회', '가해학생', '피해학생', '학교장', '전학', '서면사과', '출석정지', '따돌림', '소년보호', '촉법소년', '보호처분'],
  },
  {
    key: '이혼·가사',
    anchor: '이혼',
    cues: ['이혼', '재산분할', '양육권', '양육비', '위자료', '친권', '면접교섭', '혼인', '배우자', '부정행위', '사실혼', '졸혼'],
    terms: ['재산분할', '양육권', '양육비', '위자료', '친권', '면접교섭', '사실혼', '유책배우자', '기여도', '특유재산', '혼인파탄'],
    relevance: ['이혼', '혼인', '배우자', '양육', '재산분할', '위자료', '친권', '가사'],
  },
  {
    key: '상속',
    anchor: '상속',
    cues: ['상속', '유류분', '상속포기', '한정승인', '유언', '증여', '피상속인', '상속인'],
    terms: ['유류분', '상속포기', '한정승인', '유언', '특별수익', '기여분', '상속재산분할', '유증'],
    relevance: ['상속', '유류분', '피상속인', '상속인', '유언', '증여', '유증'],
  },
  {
    key: '채권·집행',
    anchor: '대여금',
    cues: ['빌려준', '못 받', '미수금', '물건값', '대금', '지급명령', '강제집행', '가압류', '월세', '보증금', '공사대금', '외상'],
    terms: ['지급명령', '강제집행', '가압류', '소멸시효', '보증금', '임대차', '공사대금', '매매대금', '부당이득'],
    relevance: ['대여금', '지급명령', '강제집행', '가압류', '소멸시효', '보증금', '매매대금', '공사대금', '부당이득'],
  },
  {
    key: '임대차',
    anchor: '임대차',
    cues: ['전세', '월세', '임대차', '보증금', '집주인', '세입자', '명도', '갱신'],
    terms: ['보증금', '명도', '갱신요구', '대항력', '우선변제', '차임연체', '원상회복'],
    relevance: ['임대차', '보증금', '임차인', '임대인', '명도', '차임'],
  },
  {
    key: '형사',
    anchor: '형사',
    cues: ['고소', '고발', '수사', '경찰', '검찰', '구속', '기소', '불송치', '무혐의', '벌금', '실형', '집행유예', '항소', '피의자', '피해자'],
    terms: ['불송치', '이의신청', '공소시효', '집행유예', '선고유예', '정상참작', '합의', '고소취소', '구속영장', '무죄'],
    relevance: ['피고인', '피의자', '공소', '형법', '유죄', '무죄', '양형', '수사'],
  },
  {
    key: '음주운전·면허',
    anchor: '음주운전',
    cues: ['음주운전', '면허취소', '면허정지', '단속', '혈중알코올', '측정거부', '뺑소니'],
    terms: ['면허취소', '면허정지', '측정거부', '혈중알코올농도', '재량권', '행정심판', '생계형'],
    relevance: ['음주운전', '운전면허', '도로교통법', '혈중알코올', '취소처분'],
  },
  {
    key: '스토킹·성범죄',
    anchor: '스토킹',
    cues: ['스토킹', '데이트폭력', '접근금지', '협박', '불법촬영', '성추행', '강제추행', '신변보호'],
    terms: ['잠정조치', '접근금지', '협박', '강제추행', '불법촬영', '반의사불벌', '신변보호'],
    relevance: ['스토킹', '협박', '강제추행', '성폭력', '잠정조치', '접근금지'],
  },
  {
    key: '가맹·프랜차이즈',
    anchor: '가맹사업',
    cues: ['가맹', '프랜차이즈', '본사', '점주', '정보공개서', '차액가맹금', '영업지역', '가맹금'],
    terms: ['정보공개서', '차액가맹금', '영업지역', '가맹계약해지', '갱신거절', '허위과장정보', '가맹금반환'],
    relevance: ['가맹사업', '가맹본부', '가맹점사업자', '정보공개서', '가맹금'],
  },
  {
    key: '회생·파산',
    anchor: '개인회생',
    cues: ['회생', '파산', '면책', '빚', '채무', '변제', '개인회생', '워크아웃'],
    terms: ['면책', '변제계획', '부인권', '채무조정', '개인파산', '청산가치'],
    relevance: ['회생', '파산', '면책', '변제계획', '채무자'],
  },
  {
    key: '노동',
    anchor: '부당해고',
    cues: ['해고', '퇴직금', '임금체불', '실업급여', '부당해고', '퇴사', '연차', '산재', '직장 내 괴롭힘'],
    terms: ['부당해고', '퇴직금', '임금체불', '구제신청', '직장내괴롭힘', '통상임금', '산업재해'],
    relevance: ['근로자', '사용자', '해고', '임금', '퇴직금', '근로기준법'],
  },
  {
    key: '명예훼손·모욕',
    anchor: '명예훼손',
    cues: ['명예훼손', '모욕', '악플', '허위사실', '비방', '유포'],
    terms: ['명예훼손', '모욕', '사실적시', '허위사실', '비방목적', '정보통신망'],
    relevance: ['명예훼손', '모욕', '사실적시', '비방', '정보통신망'],
  },
  {
    key: '행정',
    anchor: '행정처분',
    cues: ['행정심판', '행정소송', '처분취소', '영업정지', '과징금', '인허가', '집행정지'],
    terms: ['처분취소', '집행정지', '재량권일탈', '행정심판', '영업정지', '과징금'],
    relevance: ['행정처분', '재량권', '취소소송', '행정심판', '처분청'],
  },
];

/** 대화가 어느 분야인지 고른다. 못 고르면 null → 검색하지 않는다(엉뚱한 판례 방지) */
function pickDomain(text) {
  let best = null;
  let bestScore = 0;
  for (const d of DOMAINS) {
    let score = 0;
    for (const c of d.cues) if (text.includes(c)) score++;
    if (score > bestScore) {
      best = d;
      bestScore = score;
    }
  }
  return bestScore > 0 ? best : null;
}

/** 대화에서 검색 키워드를 뽑는다 — 도메인 사전에 걸리는 말만 승격(잡음 차단) */
function extractTerms(text, domain, max) {
  const hits = [];
  for (const t of domain.terms) {
    if (hits.length >= (max || 3)) break;
    if (text.includes(t)) hits.push(t);
  }
  return hits;
}

/**
 * websearch_to_tsquery는 공백을 AND로 본다 — 너무 많이 넣으면 0건이 되므로 2개까지만 묶는다.
 * citableOnly: 사건번호가 연도로 시작하는 행만(=인용 가능한 실제 판례).
 */
function ftsPath(query, limit, citableOnly) {
  return (
    '/rest/v1/cases?select=' + encodeURIComponent('case_number,court,case_date,summary,full_text') +
    '&fts=wfts(simple).' + encodeURIComponent(query) +
    (citableOnly ? '&case_number=match.' + encodeURIComponent('^(19|20)[0-9]{2}') : '') +
    '&limit=' + limit
  );
}

/**
 * 대화 내용으로 관련 판례를 찾는다.
 * 분야를 못 고르면 빈 배열 — 아무 판례나 끌어와 엉뚱한 안내를 하는 것보다 침묵이 낫다.
 */
async function searchCases(conversation, limit) {
  const max = limit || 3;
  const domain = pickDomain(conversation);
  if (!domain) return { domain: null, cases: [] };

  const terms = extractTerms(conversation, domain, 3);
  const anchor = domain.anchor;
  const queries = [
    ...terms.slice(0, 2).map((t) => anchor + ' ' + t),
    terms.length >= 2 ? terms[0] + ' ' + terms[1] : '',
    anchor,
  ].filter(Boolean);

  const seen = new Set();
  const out = [];
  const isRelevant = (t) => domain.relevance.some((r) => t.includes(r));

  // 0차 — 의미 검색(하이브리드). 표현이 달라도 사실관계가 닮은 판례를 잡아낸다.
  // ⚠ 의미 점수만 믿으면 무관한 판례가 섞인다(정본에서 실측) — 아래 관련성 검사로 거른다.
  const emb = await embedQuery(conversation.slice(0, 1500));
  if (emb) {
    const rows = await hybridRpc('hybrid_search_cases', {
      query_text: [anchor, ...terms].join(' ').slice(0, 300),
      query_embedding: emb,
      match_count: 10,
      keyword_weight: 0.5,
      semantic_weight: 0.5,
    });
    for (const r of rows) {
      if (out.length >= max) break;
      const raw = r.case_number || '';
      const body = String(r.summary || r.full_text || '').replace(/\s+/g, ' ').trim();
      if (!raw || body.length < 40) continue;
      const m = raw.match(REAL_CASE_NO);
      const real = m ? m[1] : '';
      const court = r.court && r.court !== '미상' ? r.court : '';
      if (!real || !court) continue; // 의미 검색분은 인용 가능한 것만
      if (seen.has(real)) continue;  // 같은 사건이 청크별로 여러 번 올라온다
      if (!isRelevant(body)) continue;
      seen.add(real);
      out.push({ caseNumber: real, court, date: String(r.case_date || '').slice(0, 10), summary: body.slice(0, 500), citable: true });
    }
  }

  // 1차는 인용 가능한 판례만, 2차는 제한 없이 — 인용감을 먼저 확보하고 내용을 보탠다
  const passes = [
    ...queries.map((q) => ({ q, citableOnly: true })),
    ...queries.map((q) => ({ q, citableOnly: false })),
  ];
  for (const pass of passes) {
    if (out.length >= max) break;
    const rows = await rest(ftsPath(pass.q, 6, pass.citableOnly));
    for (const r of rows) {
      if (out.length >= max) break;
      const raw = r.case_number || '';
      const body = String(r.summary || r.full_text || '').replace(/\s+/g, ' ').trim();
      if (!raw || body.length < 40) continue;
      const m = raw.match(REAL_CASE_NO);
      const real = m ? m[1] : '';
      const court = r.court && r.court !== '미상' ? r.court : '';
      const dedupe = real || raw;
      if (seen.has(dedupe)) continue;
      if (!isRelevant(body)) continue;
      seen.add(dedupe);
      out.push({
        caseNumber: real,
        court,
        date: String(r.case_date || '').slice(0, 10),
        summary: body.slice(0, 500),
        citable: Boolean(real && court),
      });
    }
  }

  // 인용 가능한 판례를 앞으로
  out.sort((a, b) => Number(b.citable) - Number(a.citable));
  return { domain: domain.key, cases: out };
}

module.exports = { searchCases, pickDomain };
