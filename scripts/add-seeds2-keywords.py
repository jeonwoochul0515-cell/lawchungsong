# 2차 고객 검색 문장에서 나온 신규 키워드를 분야별 그룹에 추가한다

import sys, os, re, json, argparse
sys.path.insert(0, r"C:\Users\jeonw\tools\naver-api")
from searchad_create_campaign import load_env, call

load_env()
CID = os.environ["NAVER_SA_CUSTOMER_ID"]
KEY = os.environ["NAVER_SA_API_KEY"]
SEC = os.environ["NAVER_SA_SECRET_KEY"]
CAMPAIGN = "cmp-a001-01-000000010880704"

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = json.load(open(os.path.join(HERE, "..", "ad-keywords", "seeds2_new.json"), encoding="utf-8"))

# 판결이 끝난 뒤 이수하는 교육 프로그램 검색 — 수임 단계가 이미 지났다
DROP_EDU = r"교육|캠페인|수료증|강의|예방|재범방지|재발방지|근절|이수"
# 우리 업무가 아닌 것
DROP_ETC = (r"채무통합|통신연체|퇴직금|임금체불|해고|산재|"
            r"과태료납부|국세청|홈택스|연말정산")
# 단일 일반명사 (노출만 먹고 클릭률을 떨어뜨린다)
SINGLE = {"공탁", "고발", "과징금", "고소", "합의", "압류", "추심", "연체", "전과", "폐업", "사채", "자백"}

FIELD = [
 ("07_롱테일_이혼가사", r"이혼|양육|재산분할|위자료|상간|친권|면접교섭|부부|혼인|가정폭력"),
 ("05_롱테일_회생채무", r"회생|파산|면책|채무|압류|추심|워크아웃|신용회복|연체이자|해방공탁|압류범위|사유서|각서"),
 ("09_롱테일_학폭",     r"학폭|학교폭력|소년|촉법"),
 ("06_롱테일_형사서식", r"."),
]

def pick():
    out, dropped = {}, []
    for r in DATA:
        kw = r["kw"]
        if kw in SINGLE or re.search(DROP_EDU, kw) or re.search(DROP_ETC, kw):
            dropped.append(kw); continue
        # 검색은 많은데 광고 클릭이 적으면 클릭률을 떨어뜨린다
        if r["tot"] >= 1000 and r["clk"] < 5:
            dropped.append(kw); continue
        for g, pat in FIELD:
            if re.search(pat, kw):
                out.setdefault(g, []).append(r); break
    return out, dropped

def main(run):
    sel, dropped = pick()
    tot = sum(len(v) for v in sel.values())
    clk = sum(k["clk"] for v in sel.values() for k in v)
    cost = sum(k["bid"] * k["clk"] for v in sel.values() for k in v)
    print(f"추가 {tot}개 · 월클릭 {clk:.1f}회 · 일비용 {cost/30:,.0f}원 (걸러낸 것 {len(dropped)}개)\n")
    for g, lst in sorted(sel.items()):
        print(f"[{g}] {len(lst)}개 · 월클릭 {sum(k['clk'] for k in lst):.1f}")
        for k in sorted(lst, key=lambda x: -x["clk"])[:10]:
            print(f"    {k['kw'][:24]:<26} 검색{k['tot']:>6,} 클릭{k['clk']:>5.1f} {k['bid']:>6,}원")
        print()
    if not run:
        print("(점검만 — 실제 등록은 --run)")
        return
    groups = {g["name"]: g["nccAdgroupId"] for g in
              call("GET", "/ncc/adgroups", CID, KEY, SEC, query=f"?nccCampaignId={CAMPAIGN}")}
    for g, lst in sel.items():
        gid = groups.get(g)
        if not gid: continue
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
