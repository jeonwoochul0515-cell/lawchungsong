#!/usr/bin/env node
// 하위 페이지 푸터에 사업자정보를 넣고 상호를 정식 표기로 맞춘다.
// index.html은 별도 레이아웃이라 이 스크립트가 건드리지 않는다(2026-09-17 수동 반영 완료).
//
// 자동 발행 루틴은 "최신 글을 본으로 복제"하므로, 기존 글을 전부 고쳐 두면
// 이후 발행분도 새 푸터를 그대로 물려받는다. 템플릿 파일은 따로 없다.
import { readFileSync, writeFileSync } from 'node:fs';
import { globSync } from 'node:fs';

// 푸터 문구는 세 갈래로 갈라져 있다 — 가운뎃점이 `·`인 것과 `&middot;`인 것,
// 광고물 고지 없이 저작권만 있는 것, attorney.html처럼 주소·전화가 이미 붙은 것.
// 저작권 줄 전체를 잡아 하나로 통일한다.
const OLD = /(?:이 사이트는 변호사법 제23조에 따른 광고물입니다\s*(?:&middot;|·)\s*)?&copy; 2026 법률사무소 청송 \(Law Firm Cheongsong\)[^<]*/g;
const NEW = [
  '이 사이트는 변호사법 제23조에 따른 광고물입니다',
  '법률사무소 청송law · 대표변호사 김창희 · 사업자등록번호 102-78-00061',
  '부산광역시 연제구 법원남로15번길 10, 202호 (거제동, 미르코아빌딩) · 대표전화 1660-4452',
  '&copy; 2026 법률사무소 청송law (Law Firm Cheongsong). All rights reserved.',
].join('<br>');

const files = globSync(['columns/*.html', 'precedents/*.html', 'practice/*.html', '*.html']);
let changed = 0;
for (const f of files) {
  if (f === 'index.html') continue;
  const src = readFileSync(f, 'utf8');
  OLD.lastIndex = 0;
  if (!OLD.test(src)) continue;
  writeFileSync(f, src.replace(OLD, NEW));
  changed++;
}
console.log(`footer updated: ${changed} / scanned ${files.length}`);
