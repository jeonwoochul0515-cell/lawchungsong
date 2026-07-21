# 청송 홈페이지 캠페인의 학폭 키워드를 학폭119(hakpok-119.com) 전용 캠페인으로 옮긴다
# 방침: 학폭 유입은 학폭119가 1차. 청송 홈페이지 학폭 그룹은 중지한다.
# 주의: 학폭119 비즈채널이 아직 심사 중(UNDER_REVIEW)이라 통과 전에는 노출되지 않는다.

import sys, os, json, argparse
sys.path.insert(0, r"C:\Users\jeonw\tools\naver-api")
from searchad_create_campaign import load_env, call

load_env()
CID = os.environ["NAVER_SA_CUSTOMER_ID"]
KEY = os.environ["NAVER_SA_API_KEY"]
SEC = os.environ["NAVER_SA_SECRET_KEY"]

MINE = "cmp-a001-01-000000010880704"           # 변호사 김창희 (청송 홈페이지)
HP_CAMP = "cmp-a001-01-000000010881695"        # 학폭119 초기대응 전문 변호사
BASE = "https://hakpok-119.com"
UTM = "utm_source=naver&utm_medium=cpc&utm_campaign="

def find_channel():
    for ch in call("GET", "/ncc/channels", CID, KEY, SEC, query="?channelTp=SITE"):
        if "학폭" in ch["name"]:
            return ch["nccBusinessChannelId"], ch["status"]
    return None, None

# 청송 09_롱테일_학폭 30개를 성격별로 두 그룹으로 나눠 랜딩을 분리한다
GROUPS = [
 {"name": "학폭_대응_상담", "budget": 3000, "url": f"{BASE}/consult?{UTM}defense",
  "headline": "학폭위 대응, 초기 72시간",
  "desc": "학교폭력대책심의위원 출신 변호사가 출석 준비부터 함께합니다. 1660-4452.",
  "match": ["학폭위상담", "학폭위의견서", "학폭위결과언제", "학폭서면사과", "학폭전학", "학폭퇴학",
            "학폭학급교체", "학폭화해", "학폭무고", "학폭보복", "학폭목격자진술", "학교폭력사과문",
            "학교폭력가해자변호사", "학폭위기간", "학교폭력기간", "학교폭력로펌"]},
 {"name": "학폭_불복_소년", "budget": 2000, "url": f"{BASE}/?{UTM}appeal",
  "headline": "학폭 처분 불복 소년사건",
  "desc": "학폭위 결정 불복과 소년보호사건을 부산 변호사가 함께 봅니다. 1660-4452.",
  "match": ["학폭처분취소소송", "촉법소년손해배상", "소년범죄변호사", "소년법전문변호사",
            "촉법소년변호사", "청소년전문변호사", "교권보호위원회변호사",
            "강서구학교폭력변호사", "양산학교폭력변호사", "김해학교폭력변호사",
            "진주학교폭력변호사", "진주학폭변호사", "거제학폭변호사", "통영학폭변호사"]},
]

def source_keywords():
    """청송 09_롱테일_학폭 그룹의 활성 키워드 {kw: bidAmt}"""
    for g in call("GET", "/ncc/adgroups", CID, KEY, SEC, query=f"?nccCampaignId={MINE}"):
        if g["name"] == "09_롱테일_학폭":
            return g["nccAdgroupId"], {
                k["keyword"]: k for k in
                call("GET", "/ncc/keywords", CID, KEY, SEC, query=f"?nccAdgroupId={g['nccAdgroupId']}")
                if not k.get("userLock")}
    return None, {}

def main(run):
    ch_id, ch_status = find_channel()
    print(f"학폭119 채널 {ch_id} · 상태 {ch_status}")
    if ch_status != "ELIGIBLE":
        print("  (심사 중 — 광고그룹·키워드는 만들되 채널 통과 전까지 노출되지 않음)")
    src_gid, src = source_keywords()
    print(f"청송 09_롱테일_학폭 원본 키워드 {len(src)}개\n")

    for g in GROUPS:
        picked = [(kw, src[kw].get("bidAmt")) for kw in g["match"] if kw in src]
        h, d = len(g["headline"]), len(g["desc"])
        cap = g["budget"]
        picked = [(kw, min(b or 70, cap)) for kw, b in picked]
        print(f"[{g['name']}] 예산 {g['budget']:,}원 · 키워드 {len(picked)}개")
        print(f"   제목({h}/15) {g['headline']}")
        print(f"   설명({d}/45) {g['desc']}")
        print(f"   랜딩 {g['url']}")
        miss = [kw for kw in g["match"] if kw not in src]
        if miss: print(f"   원본에 없음: {miss}")
    total = sum(g["budget"] for g in GROUPS)
    print(f"\n학폭119 캠페인 그룹 예산 합계 {total:,}원 (캠페인 일예산 5,000원)")

    if not run:
        print("\n(점검만 — 실제 생성은 --run)")
        return
    print("\n=== 실행 ===")
    existing = {g["name"]: g for g in
                call("GET", "/ncc/adgroups", CID, KEY, SEC, query=f"?nccCampaignId={HP_CAMP}")}
    for g in GROUPS:
        if g["name"] in existing:
            gid = existing[g["name"]]["nccAdgroupId"]
            print(f"[{g['name']}] 기존 그룹 재사용 {gid}")
        else:
            ag = call("POST", "/ncc/adgroups", CID, KEY, SEC, body={
                "nccCampaignId": HP_CAMP, "name": g["name"], "adgroupType": "WEB_SITE",
                "pcChannelId": ch_id, "mobileChannelId": ch_id,
                "bidAmt": 70, "useDailyBudget": True, "dailyBudget": g["budget"]})
            gid = ag["nccAdgroupId"]
            print(f"[{g['name']}] 광고그룹 생성 {gid}")
        have = {k["keyword"].upper() for k in
                call("GET", "/ncc/keywords", CID, KEY, SEC, query=f"?nccAdgroupId={gid}")}
        picked = [(kw, min(src[kw].get("bidAmt") or 70, g["budget"]))
                  for kw in g["match"] if kw in src and kw.upper() not in have]
        for i in range(0, len(picked), 100):
            chunk = picked[i:i+100]
            call("POST", "/ncc/keywords", CID, KEY, SEC, query=f"?nccAdgroupId={gid}",
                 body=[{"nccAdgroupId": gid, "keyword": kw, "bidAmt": b, "useGroupBidAmt": False}
                       for kw, b in chunk])
        print(f"   키워드 {len(picked)}개 등록")
        if not call("GET", "/ncc/ads", CID, KEY, SEC, query=f"?nccAdgroupId={gid}"):
            ad = call("POST", "/ncc/ads", CID, KEY, SEC, body={
                "nccAdgroupId": gid, "type": "TEXT_45",
                "ad": {"headline": g["headline"], "description": g["desc"],
                       "pc": {"final": g["url"]}, "mobile": {"final": g["url"]}}})
            print(f"   소재 생성 {ad.get('nccAdId')}")
        else:
            print("   소재 이미 있음")

    # 청송 홈페이지의 학폭 그룹 중지 (학폭119로 이양 완료)
    if src_gid:
        g = call("GET", f"/ncc/adgroups/{src_gid}", CID, KEY, SEC)
        g["userLock"] = True
        call("PUT", f"/ncc/adgroups/{src_gid}", CID, KEY, SEC, query="?fields=userLock", body=g)
        print(f"\n청송 09_롱테일_학폭 그룹 중지 (학폭119로 이양)")

if __name__ == "__main__":
    p = argparse.ArgumentParser(); p.add_argument("--run", action="store_true")
    main(p.parse_args().run)
