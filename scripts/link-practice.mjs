// 칼럼·판례 상담 상자에 해당 업무 페이지 버튼을 달고, 업무 페이지의 "이 분야의 법률 칼럼"을 최신 6편으로 다시 채운다
// 사용: node scripts/link-practice.mjs [--check]
// - 분류(index.json의 category)로만 연결한다. 맞는 업무 페이지가 없는 분류(민사·노동·행정 등)는 건너뛴다.
// - 이미 practice/ 링크가 있는 글은 손대지 않는다. 몇 번을 돌려도 결과가 같다.
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const CHECK = process.argv.includes('--check');

// 분류 → 업무 페이지. 앞에서부터 먼저 맞는 것을 쓴다('형사·가사'는 형사로).
const RULES = [
  { test: /학교폭력|소년보호/, page: 'school-violence', label: '학교폭력·소년보호' },
  { test: /형사/, page: 'criminal', label: '형사·행정' },
  { test: /^(대법원 판례 · )?행정$/, page: 'criminal', label: '형사·행정' }, // 업무 페이지가 '형사·행정'이라 순수 행정 글만 붙인다
  { test: /이혼/, page: 'divorce', label: '이혼·가사' },
  { test: /가맹|프랜차이즈/, page: 'franchise', label: '가맹·프랜차이즈' },
  { test: /회생|파산/, page: 'rehabilitation', label: '개인회생·파산' },
];
const pageFor = (category = '') => RULES.find((r) => r.test.test(category)) || null;

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const write = (p, s) => { if (!CHECK) fs.writeFileSync(path.join(ROOT, p), s); };

const articles = [];
for (const dir of ['columns', 'precedents']) {
  for (const it of JSON.parse(read(`${dir}/index.json`))) articles.push({ ...it, dir });
}

// 1) 글 → 업무 페이지 버튼
const CTA_START = /<!-- 상담 CTA -->|<div class="mt-12 bg-navy text-white rounded-2xl/;
const stats = { linked: 0, already: 0, noRule: 0, noAnchor: [], missingFile: [] };
for (const a of articles) {
  const rule = pageFor(a.category);
  const file = `${a.dir}/${a.slug}.html`;
  if (!fs.existsSync(path.join(ROOT, file))) { stats.missingFile.push(file); continue; }
  if (!rule) { stats.noRule++; continue; }
  let html = read(file);
  if (html.includes('practice/')) { stats.already++; continue; }
  const start = html.search(CTA_START);
  // 상담 상자 안 버튼 줄(전화 버튼이 든 flex 묶음)의 맨 끝, 묶음을 닫는 </div> 바로 앞에 넣는다
  // 줄바꿈은 윈도 작업본(CRLF)과 CI(LF) 둘 다 받는다
  const row = start < 0 ? null : /<div class="flex flex-col sm:flex-row gap-3 justify-center">\r?\n([ \t]*)<a href="tel:/.exec(html.slice(start));
  const close = row ? html.indexOf('</div>', start + row.index + row[0].length) : -1;
  if (close < 0) { stats.noAnchor.push(file); continue; }
  const at = html.lastIndexOf('\n', close) + 1;
  const indent = row[1];
  const eol = html.includes('\r\n') ? '\r\n' : '\n';
  const btn = `${indent}<a href="../practice/${rule.page}.html" class="px-6 py-3 bg-gold text-white font-bold rounded-full hover:bg-gray-100 hover:text-navy transition"><i class="fa-solid fa-briefcase mr-2"></i>${rule.label} 분야 안내 보기</a>${eol}`;
  html = html.slice(0, at) + btn + html.slice(at);
  write(file, html);
  stats.linked++;
}

// 2) 업무 페이지 → 최신 관련 글 6편
const BEGIN = '<!-- 관련 글 자동 목록(link-practice.mjs) 시작 -->';
const END = '<!-- 관련 글 자동 목록 끝 -->';
const card = (a, indent) => {
  const href = `../${a.dir}/${a.slug}.html`;
  const tag = a.dir === 'precedents' ? '대법원 판례' : a.category;
  return [
    `${indent}<a href="${href}" class="block bg-white rounded-2xl p-6 border border-gray-100 hover:border-navy hover:shadow-xl transition">`,
    `${indent}    <span class="text-gold text-xs font-bold">${esc(tag)}</span>`,
    `${indent}    <h3 class="font-bold text-gray-900 mt-2 leading-snug text-base">${esc(a.title)}</h3>`,
    `${indent}    <span class="mt-3 inline-block text-sm text-navy font-semibold">자세히 보기 →</span>`,
    `${indent}</a>`,
  ].join('\n');
};
const pageStats = {};
for (const rule of RULES) {
  const file = `practice/${rule.page}.html`;
  let html = read(file);
  const list = articles
    .filter((a) => pageFor(a.category)?.page === rule.page && fs.existsSync(path.join(ROOT, `${a.dir}/${a.slug}.html`)))
    .sort((x, y) => String(y.date).localeCompare(String(x.date)))
    .slice(0, 6);
  if (!list.length) { pageStats[rule.page] = 0; continue; }
  const indent = '                ';
  const eol = html.includes('\r\n') ? '\r\n' : '\n';
  const block = `${BEGIN}${eol}${list.map((a) => card(a, indent).replace(/\n/g, eol)).join(eol)}${eol}${indent}${END}`;
  const b = html.indexOf(BEGIN);
  const e = b < 0 ? -1 : html.indexOf(END, b);
  if (b >= 0 && e > b) {
    // 표지 문자열에 괄호가 있어 정규식 대신 위치로 바꾼다
    html = html.slice(0, b) + block + html.slice(e + END.length);
  } else {
    // 첫 실행: "이 분야의 법률 칼럼" 아래 카드 격자 안쪽을 통째로 바꾼다
    const h2 = html.indexOf('이 분야의 법률 칼럼</h2>');
    const gridOpen = h2 < 0 ? -1 : html.indexOf('<div class="grid', h2);
    const innerStart = gridOpen < 0 ? -1 : html.indexOf('>', gridOpen) + 1;
    const nextH2 = innerStart < 0 ? -1 : html.indexOf('<h2', innerStart);
    const innerEnd = nextH2 < 0 ? -1 : html.lastIndexOf('</div>', nextH2);
    if (innerEnd < innerStart || innerStart <= 0) { pageStats[rule.page] = 'NO_GRID'; continue; }
    html = `${html.slice(0, innerStart)}${eol}${indent}${block}${eol}            ${html.slice(innerEnd)}`;
  }
  write(file, html);
  pageStats[rule.page] = list.length;
}

console.log(JSON.stringify({ check: CHECK, articles: articles.length, ...stats, practice: pageStats }, null, 1));
// 자리를 못 찾은 글·업무 페이지는 경고만 한다 — 이 단계가 실패하면 뒤의 다인 목록 갱신·커밋까지 멈추기 때문이다.
if (stats.noAnchor.length || Object.values(pageStats).includes('NO_GRID')) console.warn('경고: 자리를 못 찾은 파일이 있다(위 noAnchor·NO_GRID). 손으로 확인할 것.');
