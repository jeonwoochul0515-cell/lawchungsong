# 초저가(500원 이하) 롱테일 키워드를 분야별 광고그룹으로 대량 등록하고 기존 그룹 예산을 재배분한다

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

# 창업 아이템 탐색(분쟁 의뢰가 아님)은 가맹 그룹에서 뺀다
DROP_FRANCHISE = r"PC방|삼겹살|커피|치킨|피자|카페|분식|국밥|고기|주점|호프|편의점|세탁|스터디카페|무인"

GROUPS = [
 {"name": "05_롱테일_회생채무", "field": "회생파산", "budget": 2000,
  "url": f"{BASE}/practice/rehabilitation.html?{UTM}lt_rehab",
  "headline": "연체, 압류 채무 절차안내",
  "desc": "부산회생법원 관할 개인회생, 파산 절차를 변호사가 직접 안내합니다."},
 {"name": "06_롱테일_형사서식", "field": "형사행정", "budget": 1500,
  "url": f"{BASE}/columns/2026-07-20-criminal-petition-letter-guide.html?{UTM}lt_criminal",
  "headline": "탄원서 반성문 쓰는 법",
  "desc": "부산지검 형사조정위원 출신 변호사가 작성 요령과 주의점을 정리했습니다."},
 {"name": "07_롱테일_이혼가사", "field": "이혼가사", "budget": 500,
  "url": f"{BASE}/practice/divorce.html?{UTM}lt_divorce",
  "headline": "양육비 재산분할 기준안내",
  "desc": "부산가정법원 위탁보호위원 출신 변호사가 산정 기준을 짚어드립니다."},
 {"name": "08_롱테일_가맹", "field": "가맹", "budget": 300,
  "url": f"{BASE}/practice/franchise.html?{UTM}lt_franchise",
  "headline": "가맹계약 정보공개서 검토",
  "desc": "변호사와 가맹거래사 자격을 함께 갖춘 대리인이 가맹 분쟁을 다룹니다."},
 {"name": "09_롱테일_학폭", "field": "학교폭력", "budget": 200,
  "url": f"{BASE}/practice/school-violence.html?{UTM}lt_school",
  "headline": "학폭위 대응 절차안내",
  "desc": "학교폭력대책심의위원 출신 변호사가 초기 대응부터 함께합니다."},
]

# 기존 그룹 예산 재배분 (롱테일 3,000원 확보)
REBUDGET = {
 "01_브랜드방어": 1000,
 "02_회생채무절차": 1500,
 "03_이혼계산기": 500,
 "04_형사서식": 2500,
}

FINAL = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)),
                                    "..", "ad-keywords", "longtail_final.json"), encoding="utf-8"))

def kws_for(field):
    lst = FINAL.get(field, [])
    if field == "가맹":
        lst = [k for k in lst if not re.search(DROP_FRANCHISE, k["kw"], re.I)]
    return lst

def check():
    ok = True
    tot_kw = tot_clk = tot_cost = 0
    for g in GROUPS:
        ks = kws_for(g["field"])
        h, d = len(g["headline"]), len(g["desc"])
        if h > 15 or d > 45: ok = False
        clk = sum(k["clk"] for k in ks)
        cost = sum(k["bid"] * k["clk"] for k in ks)
        tot_kw += len(ks); tot_clk += clk; tot_cost += cost
        print(f"[{g['name']}] 예산 {g['budget']:,}원 · 키워드 {len(ks)}개 · 월클릭 {clk:,.0f}회 · 월비용상한 {cost:,.0f}원")
        print(f"   제목({h}/15) {g['headline']}")
        print(f"   설명({d}/45) {g['desc']}")
    print(f"\n롱테일 합계 키워드 {tot_kw}개 · 월클릭 {tot_clk:,.0f}회 · 월비용상한 {tot_cost:,.0f}원 (일 {tot_cost/30:,.0f}원)")
    print(f"신규 그룹 예산 {sum(g['budget'] for g in GROUPS):,}원 + 기존 재배분 {sum(REBUDGET.values()):,}원 = {sum(g['budget'] for g in GROUPS)+sum(REBUDGET.values()):,}원")
    return ok

def run():
    existing = {g["name"]: g for g in
                call("GET", "/ncc/adgroups", CID, KEY, SEC, query=f"?nccCampaignId={CAMPAIGN}")}

    # 1) 기존 그룹 예산 재배분
    for name, budget in REBUDGET.items():
        g = existing.get(name)
        if not g:
            print(f"[재배분] {name} 없음 — 건너뜀"); continue
        if g.get("dailyBudget") == budget:
            print(f"[재배분] {name} 이미 {budget:,}원"); continue
        g2 = dict(g); g2["dailyBudget"] = budget; g2["useDailyBudget"] = True
        # 서명은 쿼리스트링을 뺀 URI로 만들어야 하므로 query 인자로 분리해서 넘긴다
        call("PUT", f"/ncc/adgroups/{g['nccAdgroupId']}", CID, KEY, SEC,
             query="?fields=budget", body=g2)
        print(f"[재배분] {name} {g.get('dailyBudget'):,} -> {budget:,}원")

    # 2) 롱테일 그룹 생성
    for g in GROUPS:
        ks = kws_for(g["field"])
        if not ks:
            print(f"[{g['name']}] 키워드 없음 — 건너뜀"); continue
        if g["name"] in existing:
            gid = existing[g["name"]]["nccAdgroupId"]
            print(f"[{g['name']}] 기존 그룹 재사용 {gid}")
        else:
            ag = call("POST", "/ncc/adgroups", CID, KEY, SEC, body={
                "nccCampaignId": CAMPAIGN, "name": g["name"], "adgroupType": "WEB_SITE",
                "pcChannelId": CHANNEL, "mobileChannelId": CHANNEL,
                "bidAmt": 70, "useDailyBudget": True, "dailyBudget": g["budget"],
            })
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
                       "pc": {"final": g["url"]}, "mobile": {"final": g["url"]}},
            })
            print(f"   소재 생성 {ad.get('nccAdId')}")

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
        print("\n=== 실행 ===")
        run()
