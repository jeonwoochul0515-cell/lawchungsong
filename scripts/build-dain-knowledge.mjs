// 다인(상담 챗봇)이 안내할 콘텐츠 목록을 만든다.
// columns/practice/precedents의 <title>과 meta description을 뽑아 api/_knowledge.json으로 저장한다.
// 칼럼·판례가 새로 발행되면 이 파일이 뒤처지므로 CI(.github/workflows/dain-knowledge.yml)가 자동 실행한다.
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

function meta(path) {
  const h = readFileSync(path, 'utf8');
  const t = h.match(/<title>([\s\S]*?)<\/title>/i);
  const d = h.match(/<meta\s+name="description"\s+content="([\s\S]*?)"/i);
  let title = t ? t[1].replace(/\s+/g, ' ').trim() : '';
  let desc = d ? d[1].replace(/\s+/g, ' ').trim() : '';
  // 제목의 SEO 꼬리(" | 부산 OO 변호사 청송") 제거 — 첫 세그먼트만 남긴다
  title = title.split('|')[0].trim();
  // 요지의 상투구 제거
  desc = desc.replace(/^부산\s*[^.]{0,20}변호사가\s*(알려주는|설명하는)\s*/, '');
  desc = desc.replace(/^부산\s*[^.]{0,20}법률사무소\s*청송[.]?\s*/, '');
  return { title, lead: desc.slice(0, 80) };
}

function collect(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith('.html'))
    .sort()
    .map((f) => {
      const { title, lead } = meta(join(dir, f));
      return title ? { path: `/${dir}/${f}`, title, lead } : null;
    })
    .filter(Boolean);
}

const out = {
  columns: collect('columns'),
  practice: collect('practice'),
  precedents: collect('precedents'),
};

if (!existsSync('api')) mkdirSync('api');
const target = 'api/_knowledge.json';
const next = JSON.stringify(out, null, 1);
const prev = existsSync(target) ? readFileSync(target, 'utf8') : '';

if (prev === next) {
  console.log('변경 없음 — 칼럼 %d, 업무분야 %d, 판례 %d', out.columns.length, out.practice.length, out.precedents.length);
} else {
  writeFileSync(target, next);
  console.log('갱신 — 칼럼 %d, 업무분야 %d, 판례 %d', out.columns.length, out.practice.length, out.precedents.length);
}
