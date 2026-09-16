// 손님 의도 판정 — "진짜 사건인가, 양식만 받으러 왔나"
//
// 두 단계로 본다.
//  ① 유입 검색어(결정적 규칙): 양식·작성법을 찾는 말인지, 변호사를 찾는 말인지
//  ② 접수 내용(Claude 구조화 판정): 본인 사건의 구체적 사실이 있는지
//
// ②는 실패해도 접수를 막지 않는다 — 판정은 부가 정보이고 접수가 본체다.
const Anthropic = require('@anthropic-ai/sdk');

const CLAUDE_MODEL = 'claude-sonnet-5';

// ── ① 유입 검색어 분류 ─────────────────────────────────────────
// 광고 90일 실측(2026-09-15)에서 클릭의 84%가 '양식·방법' 계열이었고 접수는 거의 없었다.
// 이 분류가 있어야 나중에 "어떤 말로 온 사람이 실제 손님이었나"를 셀 수 있다.
const ENTRY_HIRE = /변호사|법률사무소|법무|사무실|상담|수임|선임|비용|수수료|의뢰/;
// 서식 이름 자체(내용증명·차용증·탄원서…)도 서식을 찾는 말이다. "우체국내용증명"에 변호사 의도는 없다.
const ENTRY_FORM = /양식|서식|쓰는법|작성|예시|샘플|예문|다운로드|계산기|보내는법|보내기|방법|절차|내용증명|차용증|탄원서|반성문|처벌불원서|합의서|각서|서약서|확인서|의견서|진정서|고소장|고발장/;

function classifyEntry(query) {
  const q = String(query || '');
  if (!q) return '';
  if (ENTRY_HIRE.test(q)) return '변호사찾음';
  if (ENTRY_FORM.test(q)) return '양식찾음';
  return '상황어';
}

// ── ② 접수 내용 판정 ───────────────────────────────────────────
const JUDGE_SYSTEM = `당신은 법률사무소 접수 내용을 읽고 "본인의 실제 사건인가"를 가르는 심사원이다.
판단 기준은 하나다. **이 사람에게 지금 진행 중이거나 임박한 구체적 사건이 있는가.**

사건이라고 볼 근거(하나라도 분명하면 '사건'):
- 사건번호, 담당 경찰서·검찰청·법원, 출석·심의·재판 날짜 같은 절차상 고유 정보
- 상대방이 특정됨(가해자·채무자·배우자·본사 등 실재하는 상대)
- 받은 문서가 있음(통지서·소장·지급명령·내용증명·고소장 등)
- 기한이 걸려 있음("○일까지", "다음 주 출석", "이의신청 기간")
- 이미 겪은 구체적 사실(날짜·장소·금액·경위)

정보라고 볼 근거('정보'):
- "어떻게 쓰나요", "양식 있나요", "일반적으로 어떻게 되나요"처럼 추상적 질문
- 본인 사건이라는 언급 없이 제도·절차만 묻는 경우
- 과제·조사·호기심으로 읽히는 경우

너무 짧거나 판단 불가면 '불명'.

반드시 아래 JSON만 출력한다. 다른 말을 붙이지 않는다.
{"intent":"사건|정보|불명","stage":"수사|재판|집행|분쟁전|불명","reason":"근거 한 줄, 25자 이내"}`;

async function judgeContent(apiKey, text) {
  if (!apiKey || !text || text.trim().length < 5) return null;
  const client = new Anthropic({ apiKey, maxRetries: 0, timeout: 8000 });
  const res = await client.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 200,
    output_config: { effort: 'low' },
    system: JUDGE_SYSTEM,
    messages: [{ role: 'user', content: text.slice(0, 6000) }],
  });
  const block = res.content.find((b) => b.type === 'text');
  const raw = block && block.type === 'text' ? block.text : '';
  const m = raw.match(/\{[\s\S]*\}/);
  if (!m) return null;
  const j = JSON.parse(m[0]);
  const intent = ['사건', '정보', '불명'].includes(j.intent) ? j.intent : '불명';
  const stage = ['수사', '재판', '집행', '분쟁전', '불명'].includes(j.stage) ? j.stage : '불명';
  const reason = String(j.reason || '').replace(/\s+/g, ' ').slice(0, 40);
  return { intent, stage, reason };
}

// ── 합산 ───────────────────────────────────────────────────────
// 접수함 한 줄에 들어갈 문자열. 사람이 목록에서 한눈에 읽는 것이 목적이다.
//   "사건 · 수사 · 경찰 출석일 있음 · [양식찾음]"
function formatIntent(judge, entry) {
  const parts = [];
  if (judge) {
    parts.push(judge.intent);
    if (judge.stage && judge.stage !== '불명') parts.push(judge.stage);
    if (judge.reason) parts.push(judge.reason);
  } else {
    parts.push('불명');
  }
  if (entry) parts.push(`[${entry}]`);
  return parts.join(' · ');
}

// 접수 한 건에 대한 전체 판정. 절대 throw하지 않는다.
async function assess({ apiKey, content, chatLog, attr }) {
  const a = (attr && (attr.first || attr.current)) || attr || {};
  const entry = classifyEntry(a.n_query || a.n_keyword || '');
  let judge = null;
  try {
    const text = [content, chatLog].filter(Boolean).join('\n\n');
    judge = await judgeContent(apiKey, text);
  } catch (e) {
    console.error('의도 판정 실패(무시)', e && e.message);
  }
  return { entry, judge, label: formatIntent(judge, entry) };
}

module.exports = { assess, classifyEntry, judgeContent, formatIntent };
