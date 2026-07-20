# 부산 지역 + 사건 + 변호사 검색어를 광고그룹으로 등록한다
# 목표는 노출이 아니라 전화·카톡 문의다. 대리인을 구하는 사람만 데려온다.

import sys, os, json, argparse
sys.path.insert(0, r"C:\Users\jeonw\tools\naver-api")
from searchad_create_campaign import load_env, call

load_env()
CID = os.environ["NAVER_SA_CUSTOMER_ID"]
KEY = os.environ["NAVER_SA_API_KEY"]
SEC = os.environ["NAVER_SA_SECRET_KEY"]
CAMPAIGN = "cmp-a001-01-000000010880704"
CHANNEL = "bsn-a001-00-000000014578955"
BASE = "https://chang-hee.kim"
UTM = "utm_source=naver&utm_medium=cpc&utm_campaign="

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = json.load(open(os.path.join(HERE, "..", "ad-keywords", "local_final.json"), encoding="utf-8"))

GROUPS = [
 {"name": "12_지역_이혼가사", "field": "이혼가사", "budget": 1000,
  "url": f"{BASE}/practice/divorce.html?{UTM}local_divorce",
  "headline": "부산 이혼 변호사 상담",
  "desc": "부산가정법원 위탁보호위원 출신. 연제구 법률사무소 청송 1660-4452."},
 {"name": "13_지역_형사", "field": "형사", "budget": 800,
  "url": f"{BASE}/practice/criminal.html?{UTM}local_criminal",
  "headline": "부산 형사 변호사 상담",
  "desc": "부산지검 형사조정위원 출신. 연제구 법률사무소 청송 1660-4452."},
 {"name": "14_지역_회생파산", "field": "회생파산", "budget": 600,
  "url": f"{BASE}/practice/rehabilitation.html?{UTM}local_rehab",
  "headline": "부산 개인회생 파산 상담",
  "desc": "부산회생법원 인근 연제구 법률사무소 청송. 상담 1660-4452."},
 {"name": "15_지역_종합", "field": "종합", "budget": 1600,
  "url": f"{BASE}/?{UTM}local_all",
  "headline": "부산 연제구 법률사무소",
  "desc": "이혼, 형사, 학교폭력, 회생파산. 김창희 변호사 상담 1660-4452."},
]
# 학폭은 기존 09 그룹(학교폭력 랜딩)에 얹는다
APPEND = {"09_롱테일_학폭": "학폭"}

# 정보 탐색형 그룹의 예산을 줄여 지역 그룹으로 옮긴다
REBUDGET = {
 "01_브랜드방어": 1000,   # 전환이 가장 확실해 유지
 "02_회생채무절차": 500,
 "03_이혼계산기": 200,    # 계산기는 전화로 이어지지 않는다
 "04_형사서식": 800,      # 탄원서 칼럼 유입은 남기되 축소
 "05_롱테일_회생채무": 700,
 "06_롱테일_형사서식": 500,
 "07_롱테일_이혼가사": 200,
 "08_롱테일_가맹": 100,
 "09_롱테일_학폭": 100,
 "10_비용_초저가": 500,
 "11_비용_핵심": 1400,
}

def check():
    ok = True
    tot = sum(g["budget"] for g in GROUPS)
    for g in GROUPS:
        ks = DATA.get(g["field"], [])
        h, d = len(g["headline"]), len(g["desc"])
        if h > 15 or d > 45: ok = False
        clk = sum(k["clk"] for k in ks)
        cost = sum(k["bid"] * k["clk"] for k in ks)
        print(f"[{g['name']}] 예산 {g['budget']:,}원 · 키워드 {len(ks)}개 · 월클릭 {clk:.1f}회 · 월비용상한 {cost:,.0f}원")
        print(f"   제목({h}/15) {g['headline']}")
        print(f"   설명({d}/45) {g['desc']}")
        for k in sorted(ks, key=lambda x: -x["clk"])[:5]:
            print(f"     {k['kw'][:22]:<24} 검색{k['tot']:>6,} 클릭{k['clk']:>5.1f} {k['bid']:>6,}원")
    for name, f in APPEND.items():
        ks = DATA.get(f, [])
        print(f"[{name}] 에 {len(ks)}개 추가 (월클릭 {sum(k['clk'] for k in ks):.1f})")
    print(f"\n신규 {tot:,}원 + 재배분 {sum(REBUDGET.values()):,}원 = {tot + sum(REBUDGET.values()):,}원")
    return ok

def add_keywords(gid, ks):
    have = {k["keyword"].upper() for k in
            call("GET", "/ncc/keywords", CID, KEY, SEC, query=f"?nccAdgroupId={gid}")}
    todo = [k for k in ks if k["kw"].upper() not in have]
    for i in range(0, len(todo), 100):
        chunk = todo[i:i+100]
        call("POST", "/ncc/keywords", CID, KEY, SEC, query=f"?nccAdgroupId={gid}",
             body=[{"nccAdgroupId": gid, "keyword": k["kw"], "bidAmt": k["bid"],
                    "useGroupBidAmt": False} for k in chunk])
    print(f"   키워드 {len(todo)}개 등록 (기존 {len(have)}개)")

def run():
    existing = {g["name"]: g for g in
                call("GET", "/ncc/adgroups", CID, KEY, SEC, query=f"?nccCampaignId={CAMPAIGN}")}
    for name, budget in REBUDGET.items():
        g = existing.get(name)
        if not g or g.get("dailyBudget") == budget:
            continue
        g2 = dict(g); g2["dailyBudget"] = budget; g2["useDailyBudget"] = True
        call("PUT", f"/ncc/adgroups/{g['nccAdgroupId']}", CID, KEY, SEC,
             query="?fields=budget", body=g2)
        print(f"[재배분] {name} {g.get('dailyBudget'):,} -> {budget:,}원")

    for g in GROUPS:
        ks = DATA.get(g["field"], [])
        if not ks:
            continue
        if g["name"] in existing:
            gid = existing[g["name"]]["nccAdgroupId"]
            print(f"[{g['name']}] 기존 그룹 재사용 {gid}")
        else:
            ag = call("POST", "/ncc/adgroups", CID, KEY, SEC, body={
                "nccCampaignId": CAMPAIGN, "name": g["name"], "adgroupType": "WEB_SITE",
                "pcChannelId": CHANNEL, "mobileChannelId": CHANNEL,
                "bidAmt": 70, "useDailyBudget": True, "dailyBudget": g["budget"]})
            gid = ag["nccAdgroupId"]
            print(f"[{g['name']}] 광고그룹 생성 {gid}")
        add_keywords(gid, ks)
        if call("GET", "/ncc/ads", CID, KEY, SEC, query=f"?nccAdgroupId={gid}"):
            print("   소재 이미 있음")
        else:
            ad = call("POST", "/ncc/ads", CID, KEY, SEC, body={
                "nccAdgroupId": gid, "type": "TEXT_45",
                "ad": {"headline": g["headline"], "description": g["desc"],
                       "pc": {"final": g["url"]}, "mobile": {"final": g["url"]}}})
            print(f"   소재 생성 {ad.get('nccAdId')}")

    for name, f in APPEND.items():
        g = existing.get(name)
        if g and DATA.get(f):
            print(f"[{name}] 지역 학폭 키워드 추가")
            add_keywords(g["nccAdgroupId"], DATA[f])

if __name__ == "__main__":
    p = argparse.ArgumentParser(); p.add_argument("--run", action="store_true")
    a = p.parse_args()
    ok = check()
    if not a.run:
        print("\n(점검만 수행 — 실제 생성은 --run)")
    elif not ok:
        print("\n글자수 초과가 있어 중단합니다.")
    else:
        print("\n=== 실행 ==="); run()
