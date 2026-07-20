# 노출만 많고 클릭이 없는 키워드를 중지한다 (삭제가 아니라 중지라 언제든 되돌릴 수 있다)

import sys, os, json, time, argparse, urllib.parse, urllib.request, urllib.error
sys.path.insert(0, r"C:\Users\jeonw\tools\naver-api")
from searchad_keywordtool import load_env, sign
from searchad_create_campaign import call

load_env()
CID = os.environ["NAVER_SA_CUSTOMER_ID"]
KEY = os.environ["NAVER_SA_API_KEY"]
SEC = os.environ["NAVER_SA_SECRET_KEY"]
CAMPAIGN = "cmp-a001-01-000000010880704"

# 이 조건을 만족하면 "노출은 먹는데 클릭은 안 되는" 키워드로 본다
MIN_IMP = 50       # 판단에 필요한 최소 노출
MAX_CTR = 0.15     # % — 파워링크 평균(1~5%)에 한참 못 미치는 수준

def stats(ids, since, until):
    ts = str(int(time.time() * 1000))
    q = urllib.parse.urlencode({"ids": ",".join(ids),
                                "fields": '["impCnt","clkCnt","ctr","avgRnk","salesAmt"]',
                                "timeRange": json.dumps({"since": since, "until": until})})
    req = urllib.request.Request(f"https://api.searchad.naver.com/stats?{q}", headers={
        "X-Timestamp": ts, "X-API-KEY": KEY, "X-Customer": CID,
        "X-Signature": sign(ts, "GET", "/stats", SEC)})
    try:
        with urllib.request.urlopen(req) as r:
            return json.loads(r.read().decode("utf-8")).get("data", [])
    except urllib.error.HTTPError:
        return []

def main(run, since, until):
    hits = []
    for g in sorted(call("GET", "/ncc/adgroups", CID, KEY, SEC,
                         query=f"?nccCampaignId={CAMPAIGN}"), key=lambda x: x["name"]):
        kws = call("GET", "/ncc/keywords", CID, KEY, SEC,
                   query=f"?nccAdgroupId={g['nccAdgroupId']}")
        if not kws:
            continue
        by_id = {k["nccKeywordId"]: k for k in kws}
        ids = list(by_id)
        data = []
        for i in range(0, len(ids), 100):
            data.extend(stats(ids[i:i+100], since, until))
            time.sleep(0.25)
        for d in data:
            imp, clk = d.get("impCnt", 0), d.get("clkCnt", 0)
            if imp < MIN_IMP:
                continue
            ctr = clk / imp * 100 if imp else 0
            if ctr > MAX_CTR:
                continue
            k = by_id.get(d["id"])
            if not k or k.get("userLock"):
                continue
            hits.append({"group": g["name"], "kw": k["keyword"], "id": d["id"],
                         "imp": imp, "clk": clk, "ctr": ctr,
                         "rank": d.get("avgRnk", 0), "cost": d.get("salesAmt", 0)})

    hits.sort(key=lambda x: -x["imp"])
    print(f"중지 대상 {len(hits)}개 (노출 {MIN_IMP}회 이상 · CTR {MAX_CTR}% 이하)")
    print(f"{'그룹':<20}{'키워드':<18}{'노출':>8}{'클릭':>6}{'CTR':>8}{'평균순위':>9}{'비용':>8}")
    for h in hits:
        print(f"{h['group']:<20}{h['kw'][:16]:<18}{h['imp']:>8,}{h['clk']:>6}"
              f"{h['ctr']:>7.2f}%{h['rank']:>9.1f}{h['cost']:>8,.0f}")
    if not run:
        print("\n(점검만 수행 — 실제 중지는 --run)")
        return
    for h in hits:
        k = call("GET", f"/ncc/keywords/{h['id']}", CID, KEY, SEC)
        k["userLock"] = True
        call("PUT", f"/ncc/keywords/{h['id']}", CID, KEY, SEC,
             query="?fields=userLock", body=k)
        print(f"중지: {h['kw']}")

if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--run", action="store_true")
    p.add_argument("--since", default="2026-07-20")
    p.add_argument("--until", default="2026-07-20")
    a = p.parse_args()
    main(a.run, a.since, a.until)
