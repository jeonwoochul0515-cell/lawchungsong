# "사건유형 + 비용" 검색어를 별도 광고그룹으로 등록한다 (의도가 가장 강한 구간)

import sys, os, json, re, argparse
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

# 부울경 밖 지역, 타직역, 우리 업무 아닌 것
DROP = (r"서울|인천|대구|광주|대전|수원|성남|용인|고양|부천|안산|의정부|청주|천안|전주|제주|"
        r"강남|서초|송파|일산|분당|경기|충북|충남|전남|경북|강원|"
        r"행정사|법무사|세무사|노무사|변리사|공인중개|"
        r"창업|탐정|흥신소|포렌식|등기|보험|국선")

DATA = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)),
                                   "..", "ad-keywords", "cost_final.json"), encoding="utf-8"))

GROUPS = [
 {"name": "10_비용_초저가", "budget": 500, "lo": 0, "hi": 2000,
  "headline": "사건별 비용 상담 안내",
  "desc": "부산 연제구 법률사무소 청송. 사안을 듣고 절차와 비용을 함께 안내합니다."},
 {"name": "11_비용_핵심", "budget": 1500, "lo": 2000, "hi": 6000,
  "headline": "사건별 비용 상담 안내",
  "desc": "부산 연제구 법률사무소 청송. 사안을 듣고 절차와 비용을 함께 안내합니다."},
]
URL = f"{BASE}/reserve.html?{UTM}cost"

# 비용 그룹 신설분(2,000원)을 만들기 위한 기존 그룹 재배분
REBUDGET = {
 "01_브랜드방어": 1000, "02_회생채무절차": 1000, "03_이혼계산기": 500, "04_형사서식": 2000,
 "05_롱테일_회생채무": 1500, "06_롱테일_형사서식": 1200, "07_롱테일_이혼가사": 400,
 "08_롱테일_가맹": 200, "09_롱테일_학폭": 200,
}

def kws_for(g):
    out = []
    for r in DATA:
        if re.search(DROP, r["kw"]):
            continue
        lo = r["bid"]
        if not (g["lo"] < lo <= g["hi"]):
            continue
        if lo > 2000 and r["clk"] < 1:      # 비싼 구간은 클릭이 실제로 나오는 것만
            continue
        if r["clk"] <= 0 and lo > 70:       # 클릭 0이면 70원짜리만 허용
            continue
        out.append(r)
    return out

def check():
    ok = True
    tot = 0
    for g in GROUPS:
        ks = kws_for(g)
        h, d = len(g["headline"]), len(g["desc"])
        if h > 15 or d > 45: ok = False
        clk = sum(k["clk"] for k in ks)
        cost = sum(k["bid"] * k["clk"] for k in ks)
        tot += g["budget"]
        print(f"[{g['name']}] 예산 {g['budget']:,}원 · 키워드 {len(ks)}개 · 월클릭 {clk:,.1f}회 · 월비용상한 {cost:,.0f}원")
        print(f"   제목({h}/15) {g['headline']}")
        print(f"   설명({d}/45) {g['desc']}")
        for k in sorted(ks, key=lambda x: -x["clk"])[:6]:
            print(f"     {k['kw'][:22]:<24} 검색{k['tot']:>7,} 클릭{k['clk']:>6.1f} {k['bid']:>6,}원")
    print(f"\n신규 {tot:,}원 + 기존 재배분 {sum(REBUDGET.values()):,}원 = {tot + sum(REBUDGET.values()):,}원")
    return ok

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
        ks = kws_for(g)
        if not ks:
            print(f"[{g['name']}] 키워드 없음 — 건너뜀"); continue
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

        have = {k["keyword"].upper() for k in
                call("GET", "/ncc/keywords", CID, KEY, SEC, query=f"?nccAdgroupId={gid}")}
        todo = [k for k in ks if k["kw"].upper() not in have]
        for i in range(0, len(todo), 100):
            chunk = todo[i:i+100]
            call("POST", "/ncc/keywords", CID, KEY, SEC, query=f"?nccAdgroupId={gid}",
                 body=[{"nccAdgroupId": gid, "keyword": k["kw"], "bidAmt": k["bid"],
                        "useGroupBidAmt": False} for k in chunk])
            print(f"   키워드 {i+len(chunk)}/{len(todo)} 등록")
        if not todo:
            print(f"   키워드 이미 {len(have)}개 등록됨")

        if call("GET", "/ncc/ads", CID, KEY, SEC, query=f"?nccAdgroupId={gid}"):
            print("   소재 이미 있음")
        else:
            ad = call("POST", "/ncc/ads", CID, KEY, SEC, body={
                "nccAdgroupId": gid, "type": "TEXT_45",
                "ad": {"headline": g["headline"], "description": g["desc"],
                       "pc": {"final": URL}, "mobile": {"final": URL}}})
            print(f"   소재 생성 {ad.get('nccAdId')}")

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
