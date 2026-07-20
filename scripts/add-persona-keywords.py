# 사이트 콘텐츠에서 도출한 페르소나 기반 검색어를 기존 분야 그룹에 추가한다
# 선별 기준 하나 — 사건이 실제로 벌어진 사람이 다음 행동을 준비하며 치는 말인가

import sys, os, re, json, argparse
sys.path.insert(0, r"C:\Users\jeonw\tools\naver-api")
from searchad_create_campaign import load_env, call

load_env()
CID = os.environ["NAVER_SA_CUSTOMER_ID"]
KEY = os.environ["NAVER_SA_API_KEY"]
SEC = os.environ["NAVER_SA_SECRET_KEY"]
CAMPAIGN = "cmp-a001-01-000000010880704"

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = json.load(open(os.path.join(HERE, "..", "ad-keywords", "persona_new.json"), encoding="utf-8"))

# 단일 일반명사는 노출만 먹고 클릭이 없다 ("가사"는 집안일 검색어다)
SINGLE = {"가사", "가사법", "연체조회", "연체정보", "면책대출", "국제사기", "전자고소"}

DROP = (
 r"통신연체|연체조회|카드연체시|양도소득세|지방세|세금|체납|무직자채무통합|채무통합|"   # 세무·대출
 r"햇살론|대출|보험|증여|상속세|"
 r"프랜차이즈(프로그램|가맹대행|확장)|스테이크|카레|가맹대행|가맹관리사|가맹거래사|"      # 창업·업체
 r"고려신용정보|신용회복위원회사이버|채무자신용(정보|조사)|"                          # 특정 업체·조회 서비스
 r"국제|외국인|혼인신고|"                                                      # 범위 밖
 r"법무법인|로펌|"                                                            # 경쟁사 지명 검색
 r"교권|"                                                                    # 랜딩 콘텐츠가 아직 없음
 r"교대역|강남역|신논현|서초|잠실|목동|일산|분당"                                   # 서울·수도권 지명
)

# 사건 당사자가 다음 행동을 준비하며 치는 말 — 이게 있으면 살린다
KEEP = (r"합의서|처벌불원|공탁|탄원서|반성문|경위서|각서|고소장|고발장|진정서|"
        r"변호사|상담|선임|압류|추심|회생|파산|면책|양육|재산분할|위자료|"
        r"학폭|학교폭력|소년|서약서|성립|해제|해지방법|막는법|신청")

FIELD = [
 ("07_롱테일_이혼가사", r"이혼|양육|재산분할|위자료|상간|친권|가정폭력|접근금지|혼인"),
 ("05_롱테일_회생채무", r"회생|파산|면책|채무|압류|추심|워크아웃|신용회복|경위서|채권|국세"),
 ("09_롱테일_학폭",     r"학폭|학교폭력|소년"),
 ("06_롱테일_형사서식", r"."),   # 나머지 형사 일체
]

def pick():
    out = {}
    for r in DATA:
        kw = r["kw"]
        if kw in SINGLE or re.search(DROP, kw) or not re.search(KEEP, kw):
            continue
        if r["clk"] <= 0 and r["tot"] < 10:
            continue
        # 검색은 많은데 광고 클릭이 0이면 노출만 먹고 클릭률을 떨어뜨린다("파산이란" 사례)
        if r["clk"] <= 0 and r["tot"] >= 500:
            continue
        for g, pat in FIELD:
            if re.search(pat, kw):
                out.setdefault(g, []).append(r)
                break
    return out

def main(run):
    sel = pick()
    tot = sum(len(v) for v in sel.values())
    clk = sum(k["clk"] for v in sel.values() for k in v)
    cost = sum(k["bid"] * k["clk"] for v in sel.values() for k in v)
    print(f"추가 대상 {tot}개 · 월클릭 {clk:.1f}회 · 일비용 {cost/30:,.0f}원\n")
    for g, lst in sorted(sel.items()):
        print(f"[{g}] {len(lst)}개")
        for k in sorted(lst, key=lambda x: -x["clk"])[:12]:
            print(f"    {k['kw'][:24]:<26} 검색{k['tot']:>6,} 클릭{k['clk']:>5.1f} {k['bid']:>6,}원")
        print()
    if not run:
        print("(점검만 수행 — 실제 등록은 --run)")
        return
    groups = {g["name"]: g for g in
              call("GET", "/ncc/adgroups", CID, KEY, SEC, query=f"?nccCampaignId={CAMPAIGN}")}
    for g, lst in sel.items():
        gid = groups.get(g, {}).get("nccAdgroupId")
        if not gid:
            print(f"{g} 없음 — 건너뜀"); continue
        have = {k["keyword"].upper() for k in
                call("GET", "/ncc/keywords", CID, KEY, SEC, query=f"?nccAdgroupId={gid}")}
        todo = [k for k in lst if k["kw"].upper() not in have]
        for i in range(0, len(todo), 100):
            chunk = todo[i:i+100]
            call("POST", "/ncc/keywords", CID, KEY, SEC, query=f"?nccAdgroupId={gid}",
                 body=[{"nccAdgroupId": gid, "keyword": k["kw"], "bidAmt": k["bid"],
                        "useGroupBidAmt": False} for k in chunk])
        print(f"[{g}] {len(todo)}개 등록")

if __name__ == "__main__":
    p = argparse.ArgumentParser(); p.add_argument("--run", action="store_true")
    main(p.parse_args().run)
