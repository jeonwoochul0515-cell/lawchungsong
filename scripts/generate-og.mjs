// columns/index.json 기준으로 OG 이미지가 없는 칼럼의 1200x630 카드를 og-template.html로 렌더해 생성 (CI/로컬 겸용)
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import puppeteer from 'puppeteer';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const index = JSON.parse(readFileSync(resolve(root, 'columns', 'index.json'), 'utf8'));
const templateUrl = pathToFileURL(resolve(root, 'scripts', 'og-template.html')).href;

const missing = index.filter((c) => !existsSync(resolve(root, 'images', 'og', `${c.slug}.jpg`)));
if (missing.length === 0) {
  console.log('생성할 OG 이미지 없음');
  process.exit(0);
}

const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: 1200, height: 630, deviceScaleFactor: 1 });

for (const c of missing) {
  // 제목이 너무 길면 카드가 넘치므로 60자에서 자름
  const title = c.title.length > 60 ? c.title.slice(0, 59) + '…' : c.title;
  const url = `${templateUrl}?cat=${encodeURIComponent(c.category)}&title=${encodeURIComponent(title)}`;
  await page.goto(url, { waitUntil: 'load' });
  const out = resolve(root, 'images', 'og', `${c.slug}.jpg`);
  await page.screenshot({ path: out, type: 'jpeg', quality: 90 });
  console.log('생성:', `images/og/${c.slug}.jpg`);
}

await browser.close();
