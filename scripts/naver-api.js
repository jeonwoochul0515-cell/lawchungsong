// 네이버 API 3종(검색·데이터랩·검색광고) 공용 호출 모듈 — 키는 naver-keys.json(gitignore)에서 로드
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const KEYS = JSON.parse(fs.readFileSync(path.join(__dirname, 'naver-keys.json'), 'utf8'));

// 일시 네트워크 오류 대비 공용 재시도 fetch
async function fetchRetry(url, opts, tries = 3) {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, opts);
      if (res.status === 429) {
        await new Promise((r) => setTimeout(r, 1500 * (i + 1)));
        continue;
      }
      return res;
    } catch (e) {
      if (i === tries - 1) throw e;
      await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
    }
  }
}

// 검색 API (webkr/blog/news 등)
async function search(type, query, display = 30, sort = 'sim') {
  const url = `https://openapi.naver.com/v1/search/${type}.json?query=${encodeURIComponent(query)}&display=${display}&sort=${sort}`;
  const res = await fetchRetry(url, {
    headers: {
      'X-Naver-Client-Id': KEYS.search.clientId,
      'X-Naver-Client-Secret': KEYS.search.clientSecret,
    },
  });
  if (!res.ok) throw new Error(`search ${type} "${query}" HTTP ${res.status}`);
  return res.json();
}

// 검색광고 API 서명 헤더
function saHeaders(method, uri) {
  const ts = Date.now().toString();
  const sig = crypto
    .createHmac('sha256', KEYS.searchad.secret)
    .update(`${ts}.${method}.${uri}`)
    .digest('base64');
  return {
    'X-Timestamp': ts,
    'X-API-KEY': KEYS.searchad.apiKey,
    'X-Customer': KEYS.searchad.customerId,
    'X-Signature': sig,
    'Content-Type': 'application/json; charset=UTF-8',
  };
}

// 키워드도구: 연관키워드 + 월간 검색량 (hint 최대 5개)
async function keywordTool(hints) {
  const uri = '/keywordstool';
  const qs = `hintKeywords=${encodeURIComponent(hints.join(','))}&showDetail=1`;
  const res = await fetchRetry(`https://api.searchad.naver.com${uri}?${qs}`, {
    headers: saHeaders('GET', uri),
  });
  if (!res.ok) throw new Error(`keywordTool HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return (await res.json()).keywordList || [];
}

// 검색광고 API 임의 POST (입찰가 추정 등)
async function saPost(uri, body) {
  const res = await fetchRetry(`https://api.searchad.naver.com${uri}`, {
    method: 'POST',
    headers: saHeaders('POST', uri),
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`POST ${uri} HTTP ${res.status}: ${text.slice(0, 300)}`);
  return JSON.parse(text);
}

const stripTags = (s) =>
  String(s || '')
    .replace(/<[^>]+>/g, '')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;|&apos;/g, "'");
const qcNum = (v) => (v === '< 10' ? 5 : +v || 0);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

module.exports = { search, keywordTool, saPost, stripTags, qcNum, sleep };
