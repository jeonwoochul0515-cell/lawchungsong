# 지역+사건+비용 3단 조합 키워드를 기존 비용 광고그룹에 추가한다 (새 그룹·예산 없이)

import sys, os, json, re, argparse
sys.path.insert(0, r"C:\Users\jeonw\tools\naver-api")
from searchad_create_campaign import load_env, call

load_env()
CID = os.environ["NAVER_SA_CUSTOMER_ID"]
KEY = os.environ["NAVER_SA_API_KEY"]
SEC = os.environ["NAVER_SA_SECRET_KEY"]
CAMPAIGN = "cmp-a001-01-000000010880704"

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = json.load(open(os.path.join(HERE, "..", "ad-keywords", "geo_cost_all.json"), encoding="utf-8"))

# 다른 도시에도 있는 구 단위 단독 지명(동구·중구·서구 등)은 어느 도시인지 모호해 제외한다
CLEAR = (r"^(부산|울산|김해|양산|창원|진주|거제|통영|밀양|해운대|서면|센텀|광안리|기장|정관|"
         r"명지|덕천|하단|거제동|연제구|동래|사하구|사상구|부산진구|금정구|수영구|영도)")

# 기존 비용 그룹의 가격대에 맞춰 배분한다
BUCKETS = [
    ("10_비용_초저가", 0, 2000),
    ("11_비용_핵심", 2000, 6000),
]

def pick(lo, hi):
    out = []
    for r in DATA:
        if not re.match(CLEAR, r["kw"]):
            continue
        if not (lo < r["bid"] <= hi):
            continue
        if r["clk"] <= 0 and r["tot"] < 10:      # 검색도 클릭도 없으면 넣어도 노출 기회가 없다
            continue
        out.append(r)
    return out

def main(run):
    groups = {g["name"]: g for g in
              call("GET", "/ncc/adgroups", CID, KEY, SEC, query=f"?nccCampaignId={CAMPAIGN}")}
    for name, lo, hi in BUCKETS:
        ks = pick(lo, hi)
        clk = sum(k["clk"] for k in ks)
        cost = sum(k["bid"] * k["clk"] for k in ks)
        print(f"[{name}] 추가 대상 {len(ks)}개 · 월클릭 {clk:.1f}회 · 월비용상한 {cost:,.0f}원")
        for k in sorted(ks, key=lambda x: -x["clk"])[:8]:
            print(f"    {k['kw'][:24]:<26} 검색{k['tot']:>6,} 클릭{k['clk']:>5.1f} {k['bid']:>6,}원")
        if not run:
            continue
        g = groups.get(name)
        if not g:
            print(f"   그룹 없음 — 건너뜀"); continue
        gid = g["nccAdgroupId"]
        have = {x["keyword"].upper() for x in
                call("GET", "/ncc/keywords", CID, KEY, SEC, query=f"?nccAdgroupId={gid}")}
        todo = [k for k in ks if k["kw"].upper() not in have]
        if not todo:
            print("   이미 전부 등록됨"); continue
        for i in range(0, len(todo), 100):
            chunk = todo[i:i+100]
            call("POST", "/ncc/keywords", CID, KEY, SEC, query=f"?nccAdgroupId={gid}",
                 body=[{"nccAdgroupId": gid, "keyword": k["kw"], "bidAmt": k["bid"],
                        "useGroupBidAmt": False} for k in chunk])
            print(f"   {i+len(chunk)}/{len(todo)}개 등록")

if __name__ == "__main__":
    p = argparse.ArgumentParser(); p.add_argument("--run", action="store_true")
    a = p.parse_args()
    main(a.run)
    if not a.run:
        print("\n(점검만 수행 — 실제 등록은 --run)")
