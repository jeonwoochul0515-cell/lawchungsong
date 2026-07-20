# 키워드 입찰가가 그룹 일예산을 넘지 않도록 상한을 씌운다
# 입찰가 > 일예산이면 클릭 한 번에 하루 예산이 통째로 나가고 초과 지출까지 생긴다

import sys, os, argparse
sys.path.insert(0, r"C:\Users\jeonw\tools\naver-api")
from searchad_create_campaign import load_env, call

load_env()
CID = os.environ["NAVER_SA_CUSTOMER_ID"]
KEY = os.environ["NAVER_SA_API_KEY"]
SEC = os.environ["NAVER_SA_SECRET_KEY"]
CAMPAIGN = "cmp-a001-01-000000010880704"

# 클릭 한 번이 그룹 하루 예산을 넘지 않게 한다. 2로 올리면 더 보수적이지만
# 최소노출가 아래로 내려가 노출 자체가 사라지는 키워드가 많아진다.
MIN_CLICKS_PER_DAY = 1
FLOOR = 70          # 네이버 최저 입찰가

def main(run):
    hits = []
    for g in sorted(call("GET", "/ncc/adgroups", CID, KEY, SEC,
                         query=f"?nccCampaignId={CAMPAIGN}"), key=lambda x: x["name"]):
        cap = max(FLOOR, g["dailyBudget"] // MIN_CLICKS_PER_DAY)
        for k in call("GET", "/ncc/keywords", CID, KEY, SEC,
                      query=f"?nccAdgroupId={g['nccAdgroupId']}"):
            if k.get("userLock"):
                continue
            bid = k.get("bidAmt") or 0
            if bid > cap:
                hits.append({"group": g["name"], "budget": g["dailyBudget"], "cap": cap,
                             "kw": k["keyword"], "id": k["nccKeywordId"], "bid": bid})

    by_group = {}
    for h in hits:
        by_group.setdefault(h["group"], []).append(h)
    print(f"입찰가가 상한(일예산의 1/{MIN_CLICKS_PER_DAY})을 넘는 키워드 {len(hits)}개\n")
    for g, lst in sorted(by_group.items()):
        b, c = lst[0]["budget"], lst[0]["cap"]
        print(f"[{g}] 일예산 {b:,}원 → 상한 {c:,}원 · {len(lst)}개")
        for h in sorted(lst, key=lambda x: -x["bid"])[:6]:
            print(f"    {h['kw'][:22]:<24} {h['bid']:>6,} → {c:,}원")
        print()
    if not run:
        print("(점검만 — 실제 적용은 --run)")
        return
    for h in hits:
        k = call("GET", f"/ncc/keywords/{h['id']}", CID, KEY, SEC)
        k["bidAmt"] = h["cap"]
        call("PUT", f"/ncc/keywords/{h['id']}", CID, KEY, SEC, query="?fields=bidAmt", body=k)
    print(f"{len(hits)}개 인하 완료")

if __name__ == "__main__":
    p = argparse.ArgumentParser(); p.add_argument("--run", action="store_true")
    main(p.parse_args().run)
