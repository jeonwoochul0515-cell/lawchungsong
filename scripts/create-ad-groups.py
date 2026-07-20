# 캠페인 "변호사 김창희"에 광고그룹 4개 + 키워드 + 소재를 실측 입찰가로 생성한다

import sys, json, argparse
sys.path.insert(0, r"C:\Users\jeonw\tools\naver-api")
from searchad_create_campaign import load_env, call

load_env()
import os
CID = os.environ["NAVER_SA_CUSTOMER_ID"]
KEY = os.environ["NAVER_SA_API_KEY"]
SEC = os.environ["NAVER_SA_SECRET_KEY"]

CAMPAIGN = "cmp-a001-01-000000010880704"   # 변호사 김창희 (일예산 10,000원)
CHANNEL  = "bsn-a001-00-000000014578955"   # chang-hee.kim

BASE = "https://chang-hee.kim"
UTM = "utm_source=naver&utm_medium=cpc&utm_campaign="

GROUPS = [
 {
  "name": "01_브랜드방어",
  "budget": 1000,
  "bid": 70,
  "url": f"{BASE}/?{UTM}brand",
  "headline": "법률사무소 청송 김창희변호사",
  "desc": "부산 연제구 법률사무소. 이혼, 학교폭력, 형사, 가맹 상담 1660-4452.",
  # 키워드: (키워드, PC 최소노출입찰가 실측값)
  "kws": [("김창희변호사",70),("법률사무소청송",970),("청송법률사무소",70),
          ("부산김창희변호사",70),("변호사김창희",70),("청송law",70)],
 },
 {
  "name": "02_회생채무절차",
  "budget": 3000,
  "bid": 1500,
  "url": f"{BASE}/practice/rehabilitation.html?{UTM}rehab",
  "headline": "통장압류 개인회생 절차안내",
  "desc": "부산회생법원 관할 개인회생, 파산 절차를 변호사가 안내합니다. 1660-4452.",
  "kws": [("개인워크아웃",1560),("압류통장해지",1950),("프리워크아웃",1150),
          ("개인파산이란",1940),("파산이란",1450),("지급명령신청서양식",1950),
          ("채무조정위원회",140)],
 },
 {
  "name": "03_이혼계산기",
  "budget": 1000,
  "bid": 400,
  "url": f"{BASE}/practice/divorce.html?{UTM}divorce",
  "headline": "양육비 재산분할 기준안내",
  "desc": "부산가정법원 위탁보호위원 출신 변호사가 산정 기준을 짚어드립니다.",
  "kws": [("양육비계산기",370),("재산분할계산기",70),("위자료계산기",270)],
 },
 {
  "name": "04_형사서식",
  "budget": 5000,
  "bid": 1000,
  "url": f"{BASE}/columns/2026-07-20-criminal-petition-letter-guide.html?{UTM}criminal",
  "headline": "탄원서, 이렇게 씁니다",
  "desc": "부산지검 형사조정위원 출신 변호사가 작성 요령과 주의점을 정리했습니다.",
  "kws": [("탄원서작성방법",970),("탄원서양식",1010),("합의서양식",500),
          ("벌금조회",1140),("탄원서예시",2970),("반성문양식",1080),
          ("경찰서고소장양식",1480),("진정서양식",430),("고발장양식",580)],
 },
]

def check():
    ok = True
    total_budget = 0
    for g in GROUPS:
        h, d = len(g["headline"]), len(g["desc"])
        total_budget += g["budget"]
        flag_h = "OK " if h <= 15 else "초과"
        flag_d = "OK " if d <= 45 else "초과"
        if h > 15 or d > 45: ok = False
        print(f"[{g['name']}] 일예산 {g['budget']:,}원 · 키워드 {len(g['kws'])}개")
        print(f"   제목({h:>2}/15) {flag_h} {g['headline']}")
        print(f"   설명({d:>2}/45) {flag_d} {g['desc']}")
        print(f"   랜딩 {g['url']}")
    print(f"\n광고그룹 일예산 합계 {total_budget:,}원 (캠페인 일예산 10,000원)")
    return ok

def run():
    """이미 만들어진 그룹·키워드·소재는 건너뛰므로 몇 번 실행해도 중복이 생기지 않는다."""
    existing = {g["name"]: g for g in
                call("GET", "/ncc/adgroups", CID, KEY, SEC, query=f"?nccCampaignId={CAMPAIGN}")}
    made = []
    for g in GROUPS:
        if g["name"] in existing:
            gid = existing[g["name"]]["nccAdgroupId"]
            print(f"[{g['name']}] 기존 그룹 재사용 {gid}")
        else:
            ag = call("POST", "/ncc/adgroups", CID, KEY, SEC, body={
                "nccCampaignId": CAMPAIGN,
                "name": g["name"],
                "adgroupType": "WEB_SITE",
                "pcChannelId": CHANNEL,
                "mobileChannelId": CHANNEL,
                "bidAmt": g["bid"],
                "useDailyBudget": True,
                "dailyBudget": g["budget"],
            })
            gid = ag["nccAdgroupId"]
            print(f"[{g['name']}] 광고그룹 생성 {gid}")

        # 네이버가 키워드를 대문자로 정규화해 저장하므로(청송law -> 청송LAW) 비교도 대문자로 한다
        have = {k["keyword"].upper() for k in
                call("GET", "/ncc/keywords", CID, KEY, SEC, query=f"?nccAdgroupId={gid}")}
        todo = [(k, b) for k, b in g["kws"] if k.upper() not in have]
        if todo:
            call("POST", "/ncc/keywords", CID, KEY, SEC, query=f"?nccAdgroupId={gid}",
                 body=[{"nccAdgroupId": gid, "keyword": k, "bidAmt": b, "useGroupBidAmt": False}
                       for k, b in todo])
            print(f"   키워드 {len(todo)}개 등록 (기존 {len(have)}개)")
        else:
            print(f"   키워드 이미 {len(have)}개 등록됨")

        if call("GET", "/ncc/ads", CID, KEY, SEC, query=f"?nccAdgroupId={gid}"):
            print("   소재 이미 있음")
        else:
            ad = call("POST", "/ncc/ads", CID, KEY, SEC, body={
                "nccAdgroupId": gid,
                "type": "TEXT_45",
                "ad": {
                    "headline": g["headline"],
                    "description": g["desc"],
                    "pc": {"final": g["url"]},
                    "mobile": {"final": g["url"]},
                },
            })
            print(f"   소재 생성 {ad.get('nccAdId')}")
        made.append({"group": g["name"], "id": gid})
    print("\n" + json.dumps(made, ensure_ascii=False, indent=1))

if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--run", action="store_true")
    a = p.parse_args()
    ok = check()
    if not a.run:
        print("\n(점검만 수행 — 실제 생성은 --run)")
    elif not ok:
        print("\n글자수 초과가 있어 중단합니다.")
    else:
        print("\n=== 생성 시작 ===")
        run()
