# "변호사를 찾는 사람"이 아닌 검색어를 전수 점검해 중지한다
# 판단 기준 하나 — 이 검색어를 친 사람이 대리인을 구하는 중인가. 아니면 돈만 나간다.

import sys, os, re, json, argparse
sys.path.insert(0, r"C:\Users\jeonw\tools\naver-api")
from searchad_create_campaign import load_env, call

load_env()
CID = os.environ["NAVER_SA_CUSTOMER_ID"]
KEY = os.environ["NAVER_SA_API_KEY"]
SEC = os.environ["NAVER_SA_SECRET_KEY"]
CAMPAIGN = "cmp-a001-01-000000010880704"

RULES = [
 # (사유, 정규식)
 ("정의·정보형(뜻이 궁금할 뿐)",
  # "추천"·"잘하는곳"은 업체를 고르는 중이라 의뢰 의도가 있으므로 남긴다
  r"(이란|란|뜻|의미|정의|개념|사례|이유|가능성|인가율|블로그|사이트|리스트|후기)$"
  r"|^(벌금|영장|가맹본부|가맹프랜차이즈)$|소송비용계산|성범죄자교육|형사재판사례|개인파산과개인회생"),

 ("타직역(법무사·공증·탐정·심리상담)",
  r"법무사|공증|탐정|흥신소|심리상담|부부클리닉|부부상담|심리치료|국선"),

 ("창업·업체 마케팅(의뢰인이 아니라 창업자)",
  r"프랜차이즈(기업|영업|대행|리스트|만들기|시작|회사|관리|개설|포스|직영점|매뉴얼|본사설립|"
  r"해외진출|인테리어업체|전문가|입점|체인|배달|상담|중개|기획|연구소|지사|거래소|본사매매|"
  r"본사매각|분석|업체|디자인|광고대행|하는법|상권분석|계약)$"
  r"|^(유명|소규모|드림|잘나가는|직영)프랜차이즈$|정육식당|갈비집|헤어샵|프랜차이즈가맹(문의|영업)"
  r"|가맹(마케팅|광고|상담|점영업대행|점관리|본부설립)$"),

 ("타지역(부울경 밖이라 수임 불가)",
  r"일산|평촌|당진|미국|베트남|중국인|안양|수원|성남|용인|고양|부천|인천|서울|대구|광주|대전"),

 ("업무 무관",
  r"자기소개서|발전기소음|폐기물|인허가대행|성범죄(센터|전문센터)|청소년심리"),

 ("행정 절차(관공서에서 처리, 수임 아님)",
  r"(판결문발급|서류신청서|신고서|증명서발급)$|이혼서류대행"),
]

KEEP = r"가맹(사업변호사|계약변호사|분쟁|해지|계약서열람|점계약)|정보공개서|전자가맹계약서|프랜차이즈법률|공정거래위원회가맹사업"

def classify(kw):
    if re.search(KEEP, kw):
        return None
    for why, pat in RULES:
        if re.search(pat, kw):
            return why
    return None

def main(run):
    hits, kept = [], 0
    for g in sorted(call("GET", "/ncc/adgroups", CID, KEY, SEC,
                         query=f"?nccCampaignId={CAMPAIGN}"), key=lambda x: x["name"]):
        for k in call("GET", "/ncc/keywords", CID, KEY, SEC,
                      query=f"?nccAdgroupId={g['nccAdgroupId']}"):
            if k.get("userLock"):
                continue
            why = classify(k["keyword"])
            if why:
                hits.append({"group": g["name"], "kw": k["keyword"],
                             "id": k["nccKeywordId"], "why": why})
            else:
                kept += 1

    by_why = {}
    for h in hits:
        by_why.setdefault(h["why"], []).append(h)
    print(f"중지 대상 {len(hits)}개 / 유지 {kept}개\n")
    for why, lst in sorted(by_why.items(), key=lambda x: -len(x[1])):
        print(f"[{why}] {len(lst)}개")
        print("   " + " / ".join(h["kw"] for h in lst))
        print()

    by_group = {}
    for h in hits:
        by_group[h["group"]] = by_group.get(h["group"], 0) + 1
    print("그룹별 중지 수")
    for g, n in sorted(by_group.items()):
        print(f"   {g}: {n}개")

    if not run:
        print("\n(점검만 수행 — 실제 중지는 --run)")
        return
    print()
    for h in hits:
        k = call("GET", f"/ncc/keywords/{h['id']}", CID, KEY, SEC)
        k["userLock"] = True
        call("PUT", f"/ncc/keywords/{h['id']}", CID, KEY, SEC,
             query="?fields=userLock", body=k)
    print(f"{len(hits)}개 중지 완료")

if __name__ == "__main__":
    p = argparse.ArgumentParser(); p.add_argument("--run", action="store_true")
    main(p.parse_args().run)
