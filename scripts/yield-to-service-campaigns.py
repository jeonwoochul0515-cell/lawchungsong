# 개별 서비스 캠페인이 전담하는 영역을 청송 홈페이지 캠페인에서 비운다
# 방침: 홈페이지 유입은 후순위, 하위 개별 서비스 유입이 1차 목표
#  - 회생·파산·채무   -> 부산회생프로(busan-hoiseng.pro)
#  - 채권추심·지급명령·강제집행·사기소송 -> 받아드림(badadrim.com)
#  - 노동·임금        -> 퇴사히어로(toesahero.com)
# 청송 홈페이지가 남겨 갖는 분야: 이혼·가사, 학교폭력, 형사, 가맹, 브랜드

import sys, os, json, argparse
sys.path.insert(0, r"C:\Users\jeonw\tools\naver-api")
from searchad_create_campaign import load_env, call

load_env()
CID = os.environ["NAVER_SA_CUSTOMER_ID"]
KEY = os.environ["NAVER_SA_API_KEY"]
SEC = os.environ["NAVER_SA_SECRET_KEY"]
MINE = "cmp-a001-01-000000010880704"          # 변호사 김창희 (청송 홈페이지)
SERVICE_CAMPAIGNS = ["부산회생프로_파워링크", "부산회생프로_핵심키워드",
                     "받아드림_파워링크", "퇴사히어로_최고신뢰"]

# 개별 서비스에 넘길 광고그룹 (그룹째 중지하고 예산 회수)
YIELD_GROUPS = ["02_회생채무절차", "05_롱테일_회생채무", "14_지역_회생파산"]
# 회수한 예산을 받을 그룹 (청송 홈페이지가 계속 맡을 분야)
REALLOC = {"12_지역_이혼가사": 1600, "13_지역_형사": 1400, "15_지역_종합": 2200}

def load_all():
    out = {}
    for c in call("GET", "/ncc/campaigns", CID, KEY, SEC):
        kws = {}
        for g in call("GET", "/ncc/adgroups", CID, KEY, SEC,
                      query=f"?nccCampaignId={c['nccCampaignId']}"):
            for k in call("GET", "/ncc/keywords", CID, KEY, SEC,
                          query=f"?nccAdgroupId={g['nccAdgroupId']}"):
                if not k.get("userLock"):
                    kws[k["keyword"].upper()] = {"group": g["name"], "id": k["nccKeywordId"]}
        out[c["name"].strip()] = {"id": c["nccCampaignId"], "kws": kws}
    return out

def main(run):
    camps = load_all()
    mine = next(v for k, v in camps.items() if v["id"] == MINE)
    service = {}
    for name in SERVICE_CAMPAIGNS:
        v = camps.get(name.strip())
        if v: service.update(v["kws"])

    groups = {g["name"]: g for g in
              call("GET", "/ncc/adgroups", CID, KEY, SEC, query=f"?nccCampaignId={MINE}")}

    # 1) 개별 서비스와 중복되는 키워드 (그룹째 넘기는 것은 제외 — 어차피 꺼진다)
    dup = [(kw, v) for kw, v in mine["kws"].items()
           if kw in service and v["group"] not in YIELD_GROUPS]
    print(f"[1] 개별 서비스와 중복 {len(dup)}개 중지 대상")
    from collections import Counter
    for g, n in Counter(v["group"] for _, v in dup).most_common():
        print(f"    {g}: {n}개")

    # 2) 그룹째 넘기기
    freed = sum(groups[g]["dailyBudget"] for g in YIELD_GROUPS if g in groups)
    print(f"\n[2] 그룹째 개별 서비스에 이양: {', '.join(YIELD_GROUPS)}")
    for g in YIELD_GROUPS:
        if g in groups:
            n = len([k for k in call("GET", "/ncc/keywords", CID, KEY, SEC,
                                     query=f"?nccAdgroupId={groups[g]['nccAdgroupId']}")
                     if not k.get("userLock")])
            print(f"    {g}: 키워드 {n}개 · 예산 {groups[g]['dailyBudget']:,}원 회수")
    print(f"    회수 예산 합계 {freed:,}원")

    print(f"\n[3] 남는 분야로 예산 재배분")
    for g, b in REALLOC.items():
        if g in groups:
            print(f"    {g}: {groups[g]['dailyBudget']:,} -> {b:,}원")
    total = sum(REALLOC.values()) + sum(
        v["dailyBudget"] for k, v in groups.items()
        if k not in YIELD_GROUPS and k not in REALLOC)
    print(f"    조정 후 그룹 예산 합계 {total:,}원")

    if not run:
        print("\n(점검만 — 실제 적용은 --run)")
        return

    for kw, v in dup:
        k = call("GET", f"/ncc/keywords/{v['id']}", CID, KEY, SEC)
        k["userLock"] = True
        call("PUT", f"/ncc/keywords/{v['id']}", CID, KEY, SEC, query="?fields=userLock", body=k)
    print(f"\n중복 키워드 {len(dup)}개 중지 완료")

    for g in YIELD_GROUPS:
        if g not in groups: continue
        gg = dict(groups[g]); gg["userLock"] = True
        call("PUT", f"/ncc/adgroups/{groups[g]['nccAdgroupId']}", CID, KEY, SEC,
             query="?fields=userLock", body=gg)
        print(f"그룹 중지: {g}")

    for g, b in REALLOC.items():
        if g not in groups: continue
        gg = dict(groups[g]); gg["dailyBudget"] = b; gg["useDailyBudget"] = True
        call("PUT", f"/ncc/adgroups/{groups[g]['nccAdgroupId']}", CID, KEY, SEC,
             query="?fields=budget", body=gg)
        print(f"예산 조정: {g} -> {b:,}원")

if __name__ == "__main__":
    p = argparse.ArgumentParser(); p.add_argument("--run", action="store_true")
    main(p.parse_args().run)
