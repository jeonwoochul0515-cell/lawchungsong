# 청송 홈페이지 캠페인(일예산 5,000원)의 그룹 예산을 실제 노출 성과에 맞춰 재배분한다
# 원칙: 노출이 실제로 발생하는 그룹에 예산을 주고, 노출 0인 지역 그룹은 최소로 낮춘다.
#       브랜드는 전환이 가장 확실하므로 유지. 그룹 예산 합계 = 캠페인 일예산 5,000원.

import sys, os, argparse
sys.path.insert(0, r"C:\Users\jeonw\tools\naver-api")
from searchad_create_campaign import load_env, call

load_env()
CID = os.environ["NAVER_SA_CUSTOMER_ID"]
KEY = os.environ["NAVER_SA_API_KEY"]
SEC = os.environ["NAVER_SA_SECRET_KEY"]
CAMPAIGN = "cmp-a001-01-000000010880704"

# 이틀 실측: 노출이 실제로 나는 06(4,414)·04(58)·08(100)·07(78)에 무게,
# 노출 0인 지역 그룹(12·13·15)은 최소로. 합계 5,000원.
BUDGET = {
    "01_브랜드방어":     500,   # 노출은 적어도 전환 최상, 브랜드 방어라 유지
    "03_이혼계산기":     200,
    "04_형사서식":       500,   # 클릭 실제 발생
    "06_롱테일_형사서식": 1500,   # 노출 4,414 — 이 캠페인의 주력
    "07_롱테일_이혼가사":  500,
    "08_롱테일_가맹":     200,
    "10_비용_초저가":     300,
    "11_비용_핵심":       200,   # 단가 높고 노출 희소 — 축소
    "12_지역_이혼가사":   400,   # 노출 0 — 최소로
    "13_지역_형사":       400,
    "15_지역_종합":       300,
}

def main(run):
    groups = {g["name"]: g for g in
              call("GET", "/ncc/adgroups", CID, KEY, SEC, query=f"?nccCampaignId={CAMPAIGN}")
              if not g.get("userLock")}
    total = sum(BUDGET.values())
    print(f"목표 그룹 예산 합계 {total:,}원 (캠페인 일예산 5,000원)\n")
    print(f"{'그룹':<20}{'현재':>7}{'변경':>7}")
    for name, nb in BUDGET.items():
        g = groups.get(name)
        cur = g["dailyBudget"] if g else "-"
        arrow = "" if g and g["dailyBudget"] == nb else "  *"
        print(f"{name:<20}{(f'{cur:,}' if isinstance(cur,int) else cur):>7}{nb:>7,}{arrow}")
    unlisted = [n for n in groups if n not in BUDGET]
    if unlisted:
        print(f"\n목록에 없는 살아있는 그룹: {unlisted}")
    if total != 5000:
        print(f"\n경고: 합계가 {total:,}원 (5,000원 아님)")
    if not run:
        print("\n(점검만 — 실제 적용은 --run)")
        return
    print()
    for name, nb in BUDGET.items():
        g = groups.get(name)
        if not g or g["dailyBudget"] == nb:
            continue
        gg = dict(g); gg["dailyBudget"] = nb; gg["useDailyBudget"] = True
        call("PUT", f"/ncc/adgroups/{g['nccAdgroupId']}", CID, KEY, SEC,
             query="?fields=budget", body=gg)
        print(f"{name}: {g['dailyBudget']:,} -> {nb:,}원")

if __name__ == "__main__":
    p = argparse.ArgumentParser(); p.add_argument("--run", action="store_true")
    main(p.parse_args().run)
