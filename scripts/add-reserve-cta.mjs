// 예약 폼 링크가 없는 페이지의 전화 CTA 옆에 온라인 예약 버튼을 일괄 삽입한다 (1회성 마이그레이션)
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, dirname } from "node:path";

const ROOT = join(dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1")), "..");
const dry = process.argv.includes("--dry");

function* walk(dir) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) {
      if (["node_modules", ".git", "api", "scripts"].includes(f)) continue;
      yield* walk(p);
    } else if (f.endsWith(".html")) yield p;
  }
}

let changed = 0;
for (const file of walk(ROOT)) {
  const rel = relative(ROOT, file).replace(/\\/g, "/");
  if (rel === "reserve.html" || rel === "404.html") continue;
  let html = readFileSync(file, "utf8");
  if (html.includes("reserve.html")) continue; // 이미 링크 있음
  // tel 전화 CTA 앵커(첫 번째)를 찾는다
  const m = html.match(/<a href="tel:1660-4452"([^>]*)>[\s\S]*?<\/a>/);
  if (!m) continue;
  const depth = rel.split("/").length - 1;
  const prefix = depth > 0 ? "../".repeat(depth) : "";
  // 전화 버튼과 같은 class를 재사용해 페이지 톤과 어긋나지 않게 한다
  const classMatch = m[1].match(/class="([^"]*)"/);
  const cls = classMatch ? classMatch[1] : "px-6 py-3 bg-white text-navy font-bold rounded-full transition";
  const btn = `<a href="${prefix}reserve.html" class="${cls}"><i class="fa-solid fa-calendar-check mr-2"></i>온라인 상담 예약</a>`;
  const insertAt = html.indexOf(m[0]) + m[0].length;
  html = html.slice(0, insertAt) + "\n                " + btn + html.slice(insertAt);
  changed++;
  console.log((dry ? "[dry] " : "") + rel);
  if (!dry) writeFileSync(file, html);
}
console.log(`\n${dry ? "삽입 예정" : "삽입 완료"}: ${changed}개 페이지`);
