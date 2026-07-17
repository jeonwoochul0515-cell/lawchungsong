// 청송 저가 클릭광고 자동 구성 — 비즈채널 심사 통과 후 실행 (광고그룹·키워드·소재 생성)
// 사용법: npm run ads          → 상태 점검 + (준비되면) 자동 구성
//        전제: 광고주센터에서 파워링크 캠페인 "청송_저가클릭"을 수동으로 1개 만들어 둘 것
//        (POST /ncc/campaigns는 권한 오류 1018로 API 생성 불가 — CLAUDE.md 확인 사항)
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const KEYS = JSON.parse(fs.readFileSync(path.join(__dirname, 'naver-keys.json'), 'utf8')).searchad;
const CHANNEL_NAME = '법률사무소청송law';
const CAMPAIGN_NAME = '청송_저가클릭';

// ── 계획 (저가클릭광고_계획_2026-07-17.md 실측 기반) ─────────────────────────
const PLAN = [
  {
    group: '청송_브랜드방어',
    landing: 'https://chang-hee.kim/?utm_source=naver&utm_medium=cpc&utm_campaign=brand',
    baseBid: 70,
    keywords: [
      ['김창희변호사', 70], ['법률사무소청송', 70], ['청송법률사무소', 70], ['부산김창희변호사', 70],
    ],
    ad: { headline: '법률사무소 청송', description: '부산 연제구 김창희 변호사. 이혼·가사·가맹·학교폭력 상담 1660-4452' },
  },
  {
    group: '청송_가맹니치',
    landing: 'https://chang-hee.kim/practice/franchise.html?utm_source=naver&utm_medium=cpc&utm_campaign=franchise',
    baseBid: 70,
    keywords: [
      ['가맹점분쟁', 70], ['가맹금반환', 70], ['프랜차이즈분쟁', 70], ['가맹본부갑질', 70],
      ['가맹분쟁조정', 70], ['정보공개서작성', 100], ['정보공개서정기변경', 100],
    ],
    ad: { headline: '가맹분쟁 변호사', description: '변호사 겸 가맹거래사. 가맹금·계약해지·정보공개서 분쟁 상담 1660-4452' },
  },
  {
    group: '청송_부산법원',
    landing: 'https://chang-hee.kim/?utm_source=naver&utm_medium=cpc&utm_campaign=court',
    baseBid: 70,
    keywords: [
      ['부산서부지원', 70], ['부산고등법원', 70], ['부산동부지원', 300], ['부산법률구조공단', 300],
    ],
    ad: { headline: '부산 연제구 변호사', description: '부산법원 인근 법률사무소 청송. 형사·가사 사건 상담 1660-4452' },
  },
];
// ────────────────────────────────────────────────────────────────────────────

function headers(method, uri) {
  const ts = Date.now().toString();
  const sig = crypto.createHmac('sha256', KEYS.secret).update(`${ts}.${method}.${uri}`).digest('base64');
  return {
    'X-Timestamp': ts, 'X-API-KEY': KEYS.apiKey, 'X-Customer': KEYS.customerId,
    'X-Signature': sig, 'Content-Type': 'application/json; charset=UTF-8',
  };
}

async function api(method, uri, { query, body } = {}) {
  const qs = query ? '?' + new URLSearchParams(query).toString() : '';
  const res = await fetch(`https://api.searchad.naver.com${uri}${qs}`, {
    method, headers: headers(method, uri), body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data; try { data = JSON.parse(text); } catch { data = text; }
  if (!res.ok) throw new Error(`${method} ${uri} HTTP ${res.status}: ${text.slice(0, 300)}`);
  return data;
}

(async () => {
  // 1) 비즈채널 상태 확인 — ELIGIBLE 아니면 여기서 종료
  const channels = await api('GET', '/ncc/channels');
  const ch = channels.find((c) => c.name === CHANNEL_NAME && c.channelTp === 'SITE');
  if (!ch) {
    console.log(`비즈채널 "${CHANNEL_NAME}" 없음 — 광고주센터에서 등록 먼저.`);
    return;
  }
  console.log(`비즈채널: ${ch.name} / status=${ch.status} / PC심사=${ch.pcInspectStatus} / MO심사=${ch.mobileInspectStatus}`);
  if (ch.status !== 'ELIGIBLE') {
    console.log('→ 아직 심사 통과 전(ELIGIBLE 아님). 통과 후 다시 실행하세요. 재시도해도 소용없음.');
    return;
  }

  // 2) 캠페인 확인 — 수동 생성된 "청송_저가클릭" 찾기
  const campaigns = await api('GET', '/ncc/campaigns');
  const cmp = campaigns.find((c) => c.name === CAMPAIGN_NAME);
  if (!cmp) {
    console.log(`캠페인 "${CAMPAIGN_NAME}" 없음 — 광고주센터에서 파워링크 캠페인을 이 이름으로 1개 만들어 주세요(일예산 3,000원 권장). API로는 캠페인 생성 불가(권한 1018).`);
    return;
  }
  console.log(`캠페인: ${cmp.name} (${cmp.nccCampaignId}) 일예산 ${cmp.dailyBudget}원`);

  // 3) 광고그룹·키워드·소재 생성 (이미 있으면 건너뜀 — 재실행 안전)
  const existingGroups = await api('GET', '/ncc/adgroups', { query: { nccCampaignId: cmp.nccCampaignId } });
  for (const p of PLAN) {
    let grp = existingGroups.find((g) => g.name === p.group);
    if (!grp) {
      grp = await api('POST', '/ncc/adgroups', {
        body: {
          nccCampaignId: cmp.nccCampaignId,
          name: p.group,
          pcChannelId: ch.nccBusinessChannelId,
          mobileChannelId: ch.nccBusinessChannelId,
          bidAmt: p.baseBid,
          useDailyBudget: false,
        },
      });
      console.log(`광고그룹 생성: ${p.group} (${grp.nccAdgroupId}) 기본입찰 ${p.baseBid}원`);
    } else {
      console.log(`광고그룹 존재: ${p.group} — 건너뜀`);
    }

    // 키워드 (이미 등록된 키워드는 제외하고 추가)
    const existingKw = await api('GET', '/ncc/keywords', { query: { nccAdgroupId: grp.nccAdgroupId } });
    const have = new Set(existingKw.map((k) => k.keyword));
    const toAdd = p.keywords
      .filter(([kw]) => !have.has(kw))
      .map(([kw, bid]) => ({ keyword: kw, bidAmt: bid, useGroupBidAmt: false }));
    if (toAdd.length) {
      const added = await api('POST', '/ncc/keywords', { query: { nccAdgroupId: grp.nccAdgroupId }, body: toAdd });
      console.log(`  키워드 ${Array.isArray(added) ? added.length : toAdd.length}개 등록: ${toAdd.map((k) => `${k.keyword}(${k.bidAmt}원)`).join(', ')}`);
    } else {
      console.log('  키워드 추가분 없음');
    }

    // 소재 (그룹에 소재가 하나도 없을 때만 생성)
    const existingAds = await api('GET', '/ncc/ads', { query: { nccAdgroupId: grp.nccAdgroupId } });
    if (existingAds.length === 0) {
      await api('POST', '/ncc/ads', {
        body: {
          nccAdgroupId: grp.nccAdgroupId,
          type: 'TEXT_45',
          ad: {
            headline: p.ad.headline,
            description: p.ad.description,
            pc: { final: p.landing },
            mobile: { final: p.landing },
          },
        },
      });
      console.log(`  소재 등록: "${p.ad.headline}" → ${p.landing.split('?')[0]}`);
    } else {
      console.log('  소재 존재 — 건너뜀');
    }
  }

  console.log('\n완료. 소재는 네이버 심사(법률 업종 서류 요구 가능 — 광고주센터 > 도구 > 서류 관리 확인) 통과 후 노출 시작됩니다.');
})().catch((e) => console.error('오류:', e.message));
