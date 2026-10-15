// 칼럼·판례 HTML의 og:image가 가리키는 images/og/ 파일이 없으면 og-template.html로 1200x630 카드를 만든다 (CI/로컬 겸용, --check는 개수만 셈)
import { readFileSync, existsSync, readdirSync, appendFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const templateUrl = pathToFileURL(resolve(root, 'scripts', 'og-template.html')).href;

// 글마다 이미지를 만들지 못한 페이지가 가리키는 대체 이미지 — 글 제목 대신 아래 문구로 만든다
const DEFAULTS = {
  'default-column.jpg': { cat: '법률 칼럼', title: '법률사무소 청송law 법률 칼럼' },
  'default-precedent.jpg': { cat: '판례 해설', title: '법률사무소 청송law 판례 해설' },
};
const SECTIONS = [
  { dir: 'columns', cat: '법률 칼럼' },
  { dir: 'precedents', cat: '판례 해설' },
];

const decode = (s) =>
  s.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
const meta = (html, prop) => {
  const m = html.match(new RegExp(`<meta\\s+property="${prop}"\\s+content="([^"]*)"`));
  return m ? decode(m[1]) : '';
};

// 파일 이름은 index.json의 slug가 아니라 HTML이 실제로 가리키는 주소에서 얻는다
// (발행 루틴이 slug와 다른 이름을 쓴 글이 있어 slug 기준으로는 404가 남았다)
const jobs = new Map(); // images/og/ 아래 파일명 → { cat, title }
for (const { dir, cat } of SECTIONS) {
  let index = [];
  try {
    index = JSON.parse(readFileSync(resolve(root, dir, 'index.json'), 'utf8'));
  } catch (e) {
    console.warn(`${dir}/index.json 읽기 실패 — 카테고리 기본값으로 계속:`, e.message);
  }
  const catBySlug = new Map(index.map((c) => [c.slug, c.category]));
  for (const f of readdirSync(resolve(root, dir))) {
    if (!f.endsWith('.html') || f === 'index.html') continue;
    const html = readFileSync(resolve(root, dir, f), 'utf8');
    const og = meta(html, 'og:image');
    const m = og.match(/^https:\/\/chang-hee\.kim\/images\/og\/([A-Za-z0-9._-]+\.jpg)$/);
    if (!m) {
      if (og && !og.startsWith('https://chang-hee.kim/images/')) console.warn(`확인 필요(사이트 밖 이미지): ${dir}/${f} → ${og}`);
      else if (og && !existsSync(resolve(root, og.replace('https://chang-hee.kim/', '')))) console.warn(`확인 필요(og 폴더 밖 파일 없음): ${dir}/${f} → ${og}`);
      continue;
    }
    const file = m[1];
    if (existsSync(resolve(root, 'images', 'og', file)) || jobs.has(file)) continue;
    const slug = f.slice(0, -'.html'.length);
    jobs.set(file, DEFAULTS[file] || { cat: catBySlug.get(slug) || cat, title: meta(html, 'og:title') || slug });
  }
}

console.log(`누락 OG: ${jobs.size}건`);
if (process.argv.includes('--check')) {
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `count=${jobs.size}\n`);
  process.exit(0);
}
if (jobs.size === 0) process.exit(0);

// 로컬에서는 PUPPETEER_DIR(이미 puppeteer가 설치된 폴더)을 빌려 쓴다 — 이 저장소의 의존성으로 넣지 않는다
const puppeteer = process.env.PUPPETEER_DIR
  ? createRequire(join(process.env.PUPPETEER_DIR, 'package.json'))('puppeteer')
  : (await import('puppeteer')).default;

const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: 1200, height: 630, deviceScaleFactor: 1 });

for (const [file, c] of jobs) {
  // 제목이 너무 길면 카드가 넘치므로 60자에서 자름
  const title = c.title.length > 60 ? c.title.slice(0, 59) + '…' : c.title;
  const url = `${templateUrl}?cat=${encodeURIComponent(c.cat)}&title=${encodeURIComponent(title)}`;
  await page.goto(url, { waitUntil: 'load' });
  await page.screenshot({ path: resolve(root, 'images', 'og', file), type: 'jpeg', quality: 90 });
  console.log('생성:', `images/og/${file}`);
}

await browser.close();
