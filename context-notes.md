# Context Notes — 고도화 작업 결정 기록

> 작업 중 내린 결정과 그 이유를 계속 누적한다. 다음 세션(사람/AI)이 재추론 없이 이어가기 위한 문서.

## 작업 배경 (2026-06-02 기준)
- 대상: 법률사무소 청송(부산 연제구, 김창희 변호사) 홍보용 정적 사이트.
- 스택: 순수 HTML/CSS/JS + Tailwind Play CDN + PWA. 빌드 도구 없음.
- 배포: GitHub(jeonwoochul0515-cell/lawchungsong) → Vercel(주 도메인 chang-hee.kim) + Firebase Hosting 설정 병존.
- 현재 코드 상태: working tree clean, 기능은 동작하나 아래 갭 존재.

## 발견된 핵심 갭
1. 문의 폼이 실제로 메일을 안 보냄 — `main.js:174` EmailJS 키가 `YOUR_PUBLIC_KEY` 플레이스홀더. 전송 실패해도 "성공" 화면이 떠서 의뢰인 문의를 놓치는 구조.
2. 성과 측정 수단 부재 — GA4/네이버 애널리틱스 없음.
3. 폼 스팸 방어 없음.
4. Tailwind Play CDN을 프로덕션에 사용 — 공식 비권장. 렌더링 지연·FOUC.
5. 이미지가 jpg(미최적화) — LCP 저하.
6. index.html 1216줄 단일 파일 + inline onclick 22개 — 유지보수 부담.

## 확정된 결정

### Phase 1 — 문의 폼: "제거 후 전화·카톡 중심"으로 결정
- **이유**: EmailJS 키 설정·유지보수 부담을 없애고, 가장 도달 확실한 채널(전화·카톡)로 단순화. 변호사 사무소 특성상 즉시 통화가 전환율이 높음. 갭 1·3을 한 번에 해소.
- **적용**: 폼/EmailJS/클립보드/성공화면 코드를 걷어내고 그 자리에 전화(1660-4452)·카카오 채널(pf.kakao.com/_zkzIX) CTA 블록을 둔다. 기존 플로팅 CTA·네비 버튼과 톤 일치.

### Phase 2 — 측정: GA4로 결정
- **이유**: 향후 구글/네이버 광고 집행 가능성 고려 시 GA4가 전환 추적·기능 면에서 유리. 무료.
- **적용**: gtag 스크립트 삽입 후 전화/카톡/예약 클릭을 전환 이벤트로 설정.
- **대기**: GA4 측정 ID(G-XXXXXXXXXX) 사용자 입력 필요.

### Phase 3 — Tailwind: "정적 CSS 빌드로 전환"으로 결정
- **이유**: Play CDN 비권장 이슈 해소 + 속도/SEO 개선. 사용자가 학습 부담을 감수하기로 함.
- **적용**: Tailwind CLI로 사용 클래스만 추출한 정적 CSS 생성, CDN JS 제거. 동시에 이미지 webp 전환.
- **주의**: 빌드 도입으로 배포 흐름이 바뀜 — Vercel 빌드 단계 추가 vs 로컬 빌드 후 정적 산출물만 푸시. Phase 3 착수 시 택1 결정 필요.

### Phase 4 — inline onclick 정리: 선택 사항, 후순위
- **이유**: 동작에는 문제없으나 유지보수성·학습 가치. 1~3 안정화 후 진행.

## 진행 원칙
- Phase 단위로 끊고 매 Phase 후 배포·확인. 디자인/콘텐츠는 보존, 기능·성능만 변경.
- 각 Phase의 검증 기준은 `checklist.md` 참조.

## 변경 이력
- 2026-06-02: 계획 수립 및 Phase 1~3 방향 확정.
- 2026-06-02: **Phase 1 완료.** index.html `#contact` 폼 → 전화·카톡·네이버 예약 3단 CTA 카드로 교체. EmailJS CDN 스크립트 제거(index.html), main.js의 EmailJS/폼 제출 코드 블록 제거. 잔여 참조 0건 확인, 헤드리스 스크린샷으로 렌더 검증. 발견: `#booking` 섹션이 동일 채널 CTA를 이미 보유 → `#contact`는 FAQ 이후 클로징 CTA 역할로 차별(디자인 상이). 각 CTA에 id(contactCallBtn/contactKakaoBtn/contactBookingBtn) 부여하여 Phase 2 GA 이벤트 연결 대비.
- 2026-06-02: **Phase 1 커밋** (b1526df).
- 2026-06-02: **Phase 3 완료.**
  - **Tailwind 빌드 전환**: Play CDN 비권장 이슈 해소. tailwindcss v3.4.19 devDep(전역 아님, 프로젝트 node_modules·gitignore). `tailwind.config.js`(content: index/404/main, **커스텀 색은 의도적으로 테마 미등록 — 옵션 B로 화면 100% 동일 유지**), `src/input.css`(@tailwind 3종). 빌드: `npm run build:css` → `css/tailwind.min.css`(24.9KB). index.html·404.html의 `<script src=cdn.tailwindcss.com>` → `<link css/tailwind.min.css>`. cdn.tailwindcss.com preconnect 제거.
  - **검증 방법**: git stash로 CDN 버전 잠시 복원 → 섹션별(expertise/booking/location) before/after 스크린샷 비교, 픽셀 동일 확인. hero/about/contact/404도 빌드 버전 렌더 정상.
  - **중요 사전버그(미수정, Phase 3 범위 외)**: `bg-gold`/`border-gold`/`hover:bg-gold`/`hover:text-navy`/`focus:ring-navy` 등은 Tailwind 기본 팔레트에 없고 인라인 설정도 없어 **현재도 무효 상태**. 인라인 `<style>`엔 `.text-navy`/`.bg-navy`/`.text-gold` 3개만 수동 정의됨. → 추후 별도로 다룰 것.
  - **이미지 webp**: 새 의존성 없이 전역 headless-tools puppeteer(Chromium canvas)로 변환. hero-bg(48.3→19.5KB), lawyer-profile(55.6→26.9KB). 원본 jpg는 fallback·og:image용으로 유지(@supports image-set, <picture>). **og:image/twitter/JSON-LD는 jpg 유지 — 카카오·네이버 미리보기 webp 미지원 회피.** preload는 webp+type. logo는 제외(5곳·파비콘 불가·실익 낮음).
  - **sw.js**: tailwind.min.css·hero-bg.webp·lawyer-profile.webp 추가, CACHE_NAME v4→v5.
  - **배포 흐름**: "로컬 빌드 후 산출물 커밋" 유지. Vercel은 "build" 스크립트가 없어 자동 빌드 안 함(정적 서빙). 단, package.json 존재로 deploy 시 npm install은 수행될 수 있음(무해). 다음 배포 후 화면 확인 권장.
- 2026-06-02: **Phase 3 커밋·푸시** (8df4d85, origin/main).
- 2026-06-02: **Phase 2 완료 (GA4).** 측정 ID `G-LZFSX216W1`. gtag.js를 index.html·404.html `<head>` 상단 삽입. main.js에 위임 클릭 리스너 추가 → 사이트 전역의 tel:/pf.kakao.com//booking 링크 클릭 시 `gtag('event','contact_click',{method})` 발송(phone/kakao/naver_booking). Phase 1에서 부여한 버튼 id에 의존하지 않고 href 패턴으로 전역 포착. 헤드리스 검증: gtag 함수 존재, config 설정, google-analytics.com으로 page_view collect 요청 실제 전송, 3종 전환 이벤트 발생 확인. sw.js 변경 없음(외부 스크립트). **남은 사용자 작업**: GA4 UI에서 `contact_click`을 주요 이벤트로 표시해야 전환으로 집계. 쿠키 동의 배너는 현재 정보성(GA 게이팅 안 함) — 필요 시 consent mode 별도 도입.
- 2026-06-02: **Phase 4 완료 (inline onclick 정리).** index.html의 onclick 22개를 `data-action` 속성으로 치환(open-modal은 data-modal로 인자 전달), main.js에 단일 클릭 위임 디스패처 추가로 동작을 마크업에서 분리. openModal/closeModal은 index.html 인라인 스크립트의 전역 함수라 디스패처가 그대로 호출(window 전역). 헤드리스 검증으로 모바일 메뉴 열기/닫기, 모달 열기(제목·항목)/닫기, FAQ 아코디언, 쿠키 동의, 로고 스크롤탑 전부 정상 확인. GA 전환 리스너와는 별도 리스너(둘 다 document click, 충돌 없음).
- 2026-06-02: **디자인 폴리시 4종.** ① html scroll-padding-top:6rem(고정 네비에 앵커 제목 안 가림) ② 쿠키 배너 한 줄 슬림 바로 축소 ③ 후기 섹션에 네이버 실제 후기 링크 추가 ④ 404.html 파비콘 jpg→png(index.html은 이미 png였음). 헤드리스 검증 완료.
- 2026-06-02: **2026 GEO/SEO 보강.** 근거: 웹 리서치(2026 GEO 가이드들). 핵심은 "클릭→인용(citation) 최적화" + AI 크롤러 허용. 작업: ① robots.txt에 GPTBot/OAI-SearchBot/ChatGPT-User/PerplexityBot/ClaudeBot/Google-Extended/Applebot-Extended 명시 허용(기존 `* Allow /`로도 허용되지만 의도 명시) ② llms.txt 신규(llmstxt.org 포맷) ③ LegalService JSON-LD에 founder.knowsAbout·hasCredential·sameAs, 최상위 knowsAbout·hasOfferCatalog·areaServed(City/구) 추가(E-E-A-T) ④ sitemap lastmod 갱신. JSON-LD 3블록 유효성 node로 검증. 미해결: GPTBot 학습 차단 여부는 노출 우선으로 허용 선택(사용자가 원하면 차단). 후속 권장(미진행): 구글 서치콘솔·네이버 서치어드바이저 sitemap 제출, 칼럼/판례해설 콘텐츠로 인용 소스화.
- 2026-06-02: **네이버 블로그 연결 + 최신글 자동 노출.**
  - 연결: JSON-LD sameAs(founder·LegalService) + 푸터 링크 + llms.txt에 블로그(`blog.naver.com/lawchungsong`) 추가. 블로그명 "변호사엄마의 법률이야기", 대표번호 1660-4452 일치로 사무소 블로그 확인.
  - 자동 노출: **Vercel 서버리스 함수** `/api/blog.js`(CommonJS module.exports)가 네이버 RSS(`rss.blog.naver.com/lawchungsong.xml`)를 서버에서 fetch→파싱→최신 3건 JSON 반환(엣지 캐시 s-maxage=3600). 브라우저 직접 호출은 CORS 막혀서 함수 경유 필수. main.js가 `/api/blog` fetch해 #blog 섹션(FAQ와 contact 사이, bg-white) 카드 렌더. 실패 시 블로그 링크 fallback.
  - 검증: 함수 파싱 로컬 OK, puppeteer 모킹으로 카드 3개 렌더 OK, fallback OK. **단 실제 /api 함수는 Vercel 배포 후에만 end-to-end 확인 가능**(로컬 python 서버는 함수 미실행). package.json(CommonJS)+/api/*.js 조합은 Vercel 자동 함수 인식.
- 2026-06-02: **홈페이지 '법률 칼럼'(#columns) 섹션 추가.** 자체 콘텐츠를 데이터 기반으로 노출. `columns/index.json`(목록 메타) + `columns/{slug}.html`(독립 URL 상세 페이지, Article JSON-LD·SEO 메타 포함). main.js가 columns/index.json fetch해 #columns 카드 렌더(FAQ↔blog 사이, blog는 bg-gray-50으로 변경). 첫 칼럼(학폭위 출석 통지서 대응) seed. **중요**: tailwind.config content에 `./columns/**/*.html` 추가해야 칼럼 페이지 전용 클래스(h-9 등)가 빌드됨 — 안 하면 로고 등 깨짐. 향후 자동화가 칼럼 페이지 생성 시 동일 클래스셋만 쓰면 기존 빌드 CSS로 커버됨. 자동 발행 배선(루틴→git commit/push)은 미결: ① 원격 루틴 git push 권한 불확실 ② 무검수 법률 콘텐츠 라이브 게시 리스크 → 검수 게이트 권장.
- 2026-06-02: **사전 골드/네이비 버그 수정.** Phase 3에서 발견한, Tailwind 기본 팔레트에 없어 무효였던 navy/gold 클래스들을 `tailwind.config.js` theme.extend.colors에 등록(navy #1e3a8a/dark #152e6e/light #2d4ea0, gold #b4975a/light #d4b97a — 인라인 CSS 변수와 동일). 재빌드로 bg-gold·border-gold·border-navy·hover:bg-gold·hover:text-navy·focus:ring-navy 등 활성화. 인라인 <style>의 수동 .text-navy/.bg-navy/.text-gold는 동일 값이라 그대로 공존(미수정). 검증: 골드 구분선·about 네이비 프레임 표시 확인, 회귀 없음. **이제 빌드가 색을 알므로 신규 색상 클래스도 정상 동작.**
- 2026-06-23: **SEO·GEO·AEO 통합 가이드 적용 (전역 가이드 `SEO_GEO_AEO_최적화_가이드.md` 기준).** 5개 커밋으로 배포.
  - 토대 점검 결과 이미 ~95% 충족(robots+Yeti, sitemap, canonical, BreadcrumbList 전체, LegalService/Article/FAQPage(practice), 질문형 H2). 남은 갭만 보강.
  - **GEO §16**: robots.txt에 Anthropic RAG봇 `Claude-User`·`Claude-SearchBot` 추가(기존 ClaudeBot=학습봇, anthropic-ai/Claude-Web=구형).
  - **GEO §15·§6**: 칼럼·판례 23p Article에 `dateModified`(=datePublished, 신선도)·`image` 추가.
  - **SEO §5 CWV**: 전체 img 34개에 intrinsic width/height(logo 863x1024, profile 747x1024) → CLS 방지. w-auto는 aspect-ratio 확보, object-cover는 CSS 우선이라 무왜곡. lazy는 header above-fold라 미적용.
  - **AEO §12 + GEO**: 칼럼16+판례7=23p에 ①본문 상단 '핵심 요약' 두괄식 40~60단어 정답 박스 ②하단 '자주 묻는 질문' 화면 FAQ 2~3개 + FAQPage JSON-LD 1:1. 병렬 서브에이전트 23개로 본문 기반 생성, 법률 광고규정(과장·단정·승률 금지) 준수. **practice 5p는 의도적 제외** — 이미 인트로 섹션+FAQPage 보유, 요약 박스 강제 시 중복·산만.
  - **SEO/GEO §6**: 칼럼·판례 23p 글별 고유 OG 이미지(1200x630 브랜드 카드, images/og/<slug>.jpg) 생성·교체(기존 공용 lawyer-profile.jpg). 템플릿 HTML→to-png(headless) 렌더, 제목·카테고리 쿼리 주입.
  - 검증: JSON-LD 87블록 오류 0(FAQPage 29·BreadcrumbList 28·Article 23·LegalService 6·Attorney 1), OG 23개 전부 고유, HTML 구조 무결성 확인.
  - 후속 권장(미진행): og:image:width/height 태그, 차세대 포맷 OG, 타깃 프롬프트로 AI 인용 주기 점검(§20), 검색콘솔/서치어드바이저 수집요청.
- 2026-06-28: **소프트 404 수정 + 외부 인용 통합(언론·활동 페이지/sameAs/블로그 초안).**
  - **소프트404**: firebase.json catch-all rewrite(**→/404.html) 제거. rewrite는 200을 반환해 누락 OG 이미지를 소프트404로 만들던 근본원인. 제거 시 Firebase가 404.html을 진짜 404로 자동 노출. + 누락 OG 4건(06-24~26) 생성(기존 1200x630 템플릿 재현, to-png).
  - **외부 인용 수집**: 웹 19개 URL + PDF 2건 중 15웹+2PDF 성공. 미수집: 국제신문(asp 동적), 선관위(연결거부), 네이버블로그 goodpeoplei(네이버 차단→굿피플 본사이트 G1로 대체), 중앙일보(차단). 정리: 외부인용_링크목록.md.
  - **sameAs 보강**: index.html Person(김창희)에 lfind 프로필·cpmadang(정치) 추가, LegalService에 bizno·114 추가.
  - **언론·활동 페이지**: press.html 신설(칼럼 템플릿 기반). 6개 섹션(언론보도·공공위촉·강연·공익활동·처리사건·경력). ProfilePage+BreadcrumbList JSON-LD, hasOccupation(형사조정위원 등). 네비(데스크톱·모바일)·sitemap 연결. 전용 OG(press-activities.jpg).
  - **판례 4건 쉽게 풀이**(광고규정 면책): 불법촬영 손배 1500만원 인정(2024가단340864), 한방입원 보험사기 무죄 2건(2018고정220·312), 의사명의 소아진료 의료법위반(2023고합703).
  - **네이버 외부확산(가이드 §18.5 OSMU)**: 네이버 블로그는 외부 AI 크롤러 차단 → 소유 도메인(press.html)에 동일 내용을 크롤 가능 텍스트로 재배치, 외부 독립도메인 출처(법률신문·굿피플·더버터·lfind)를 본문 링크로 연결. 네이버 블로그 발행용 초안 별도 작성(네이버블로그_초안_김창희변호사_대외활동.md, 배포 제외).
  - 새 발견 직함(굿피플 G1): 마을부엌 정지 이사장·부산지검 형사조정위원·부산지법 소년위탁보호위원·부산사회복지사협회 자문변호사·로스쿨 겸임교수.
  - 검증: index/press JSON-LD 5블록 오류 0, sitemap loc 35(press 포함), press.html 풀페이지 렌더 정상.
- 2026-07-16: **노출 감소 진단 + IndexNow 자동화 + 네이버 인물정보 대응.**
  - **발단**: 사용자가 서치어드바이저 콘텐츠 노출/클릭 리포트 캡처 공유, "노출이 점점 준다"고 우려.
  - **진단**: 그래프상 7/11 이후 하락은 실제 하락이 아니라 7/1~7/9 발행 몰이로 생긴 신규 문서 테스트노출(C-Rank 신선도 부스트)이 소멸하는 정상 패턴. 30일 누적은 전월 대비 노출 +709.6%/클릭 +619%로 오히려 급증. 진짜 갭은 발행 주기 불규칙(콘텐츠 생산은 사용자/팀 몫이라 자동화 대상 아님)과 IndexNow 미가동 두 가지.
  - **IndexNow**: 루트의 `0924f93c083623f0aac81ce808ed9337.txt`가 이미 배포돼 있었지만(예전에 키 등록만 해두고) 실제 통지 자동화가 없었음. `.github/workflows/indexnow.yml` 신규 — push 시 columns/precedents/practice/index/press/reserve 변경분만 git diff로 추출해 searchadvisor.naver.com/indexnow + api.indexnow.org 양쪽에 POST(네이버 전용 엔드포인트와 범용 엔드포인트 이중 제출로 전파 지연 리스크 회피). `workflow_dispatch` 트리거 추가해 실제 GitHub Actions에서 수동 실행 검증(success). 기존 미통지 페이지 55건(sitemap 53 + 당일 신규 2건)은 로컬에서 curl로 1회성 일괄 제출(양쪽 200 확인)해 소급 해소.
  - **"김창희변호사"(붙여쓰기) CTR 0.4% 진단**: 사용자가 공유한 검색결과 캡처 확인 결과, 순위 문제가 아니라 네이버 인물정보 지식패널이 화면 상단을 차지해 검색 의도(이 사람이 누군지)를 클릭 없이 충족시켜버리는 구조. 인물정보의 "홈페이지" 필드는 이미 chang-hee.kim으로 정확히 연결되어 있어 추가 조치 불필요했음.
  - **네이버 인물정보 수정신청 지원**: 한자명 문의에 답하며 金昌熙(창성할 창+ 빛날 희, "창희"의 통상 표기) 확정. 사용자가 붙여넣은 실제 신청서 내용 검토 중 **영문명 필드에 도메인(chang-hee.kim)이 잘못 들어간 오류 발견** → 실제 영문 이름으로 수정 안내. 출처 URL은 기존 `외부인용_링크목록.md`에서 신뢰도순 4건(중앙일보 B4·cpmadang 구의원 당선(생년월일 1984.12.13 일치확인)·법률신문·엘파인드 변호사등록) 추천. 2026-07-16 사용자가 등록신청 제출 완료, 네이버 검토 결과 대기 중.
  - **도구 한계 확인(중요, 재시도 불필요)**: 브라우저 확장(사이트 권한 차단) · WebFetch(`Claude Code is unable to fetch from search.naver.com`) · WebSearch(`allowed_domains:['naver.com']` → "domains not accessible to our user agent") 세 가지 서로 다른 경로 모두 naver.com 자체가 Anthropic 크롤러에 차단되어 있는 게 원인. 향후 세션은 네이버 화면(서치어드바이저 진단/수집현황, 실제 검색결과, 인물정보 화면 등)을 사용자 캡처로만 확인 가능 — 브라우저 자동화 재시도는 무의미. 단, **네이버 오픈API(openapi.naver.com)·검색광고API(api.searchad.naver.com)는 정상 호출 가능**(2026-07-17 확인) — 검색결과 확인은 검색 API로 대체 가능.
- 2026-07-17: **네이버 API 4종 심층 리서치 + 제안 실행 + 저가 광고계획.**
  - **리서치**(전체: `네이버API_활용_리서치_2026-07-17.md`, 미커밋 로컬 문서): 검색광고 API로 부산 법률 키워드 검색량 실측(부산이혼전문변호사 8,810/월 등), 검색 API로 노출 진단(브랜드·틈새는 상위, 대형 키워드는 30위 밖), 데이터랩으로 학폭 신학기 계절성 확인(4월=1월의 3.5배). **데이터랩 한계 확정: 호출별 상대값 정규화라 호출 간 절대 비교(성별·연령 등) 불가 — 절대량은 검색광고 API만.**
  - **reserve.js 방어 보강**(77efe0f): 빈 origin 통과 구멍 차단(fetch POST는 Origin 항상 전송하므로 실사용자 무해) + IP당 10분 3회 rate limit(인스턴스 메모리, 유료 LMS 비용 방어). 모킹 테스트 6케이스 통과.
  - **scripts/ 신설**(06fcc11): `npm run topics`(검색광고+뉴스 API로 칼럼 주제 후보 리포트 → scripts/reports/), `npm run ranks`(타깃 25키워드 웹문서·블로그 순위 기록·비교 → rank-history.json). 공용 모듈 scripts/naver-api.js. **키는 scripts/naver-keys.json(gitignore)** — 새 클론 시 CLAUDE.md의 키로 재생성 필요. 첫 순위 기준선: 25개 중 5개가 30위 내(브랜드 3·가맹 1·학폭위통지서 1).
- 2026-07-17(저녁): **니치 칼럼 3편 발행 + 주간 자동 발행 루틴 가동 + 광고 계정 점검.**
  - **니치 리서치**(`부산니치_가맹거래사니치_리서치_2026-07-17.md`, 미커밋): ① 부산 법원 키워드는 키워드도구가 축소 표기(<10)하지만 데이터랩 상대비교로 실규모 확인(부산지방법원 월 2만대, 부산가정법원 7천대) — 검색결과는 법원 공식 사이트뿐, 변호사 실무 가이드 갭. 부산서부지원·고등법원 광고 70원. ② 가맹거래사 니치: 의뢰 키워드 검색량 작지만 정보공개서등록에 2만원대 입찰 존재(시장 증거), '부산 가맹거래사' 경쟁자는 블로그 2곳. 가맹분쟁조정·정보공개서작성 등 모바일 70원.
  - **칼럼 3편 발행**(078cb8f): 부산지검 형사조정(형사조정위원 직함 활용)·부산가정법원 협의이혼 절차·정보공개서 등록(가맹본부 B2B 시리즈 ①). OG 템플릿 `scripts/og-template.html` 신설(1200x630, ?title&cat 주입, 기존 디자인 재현) — 로컬은 to-png, CI는 generate-og.mjs로 렌더.
  - **care-law 확인**: `.antigravity/care-law` = 청송의 가맹본사 구독형 법률 케어 SaaS(케어로, admin/franchisor/franchisee 3앱, Firebase+Supabase). **care-law.kr 도메인 미연결(DNS 없음)** — 칼럼에는 '준비 중' 한 줄만 언급, 오픈 후 링크 추가할 것.
  - **주간 자동 발행**(b0f6e7e + 클라우드 루틴 trig_01MScKRwBzXBubEE91foeuhW): 매주 월 09:00 KST(UTC 00:00) 클라우드 루틴이 `scripts/topic-backlog.md` 최상단 미완료 주제 1개로 칼럼 작성→index.json·sitemap·백로그 갱신→push. 광고규정·템플릿 준수 지시 포함. OG는 `.github/workflows/og-images.yml`이 index.json 변경 감지→CI puppeteer(--no-save, 프로젝트 의존성 아님)로 생성·커밋. IndexNow는 기존 워크플로가 처리. **첫 실행 2026-07-20(월) — 실행 후 결과물 검수 권장(무검수 자동 게시 리스크는 사용자 인지下 진행). 루틴의 git push 권한은 첫 실행에서 최종 확인됨.** 백로그 8주치 시드(B2B·부산니치 교대), 소진 임박 시 루틴이 보고에 명시.
  - **광고 계정 점검(3번)**: SA API로 확인 — customerId 3247301은 구포국수체험관 명의(비즈채널 PLACE+SITE 모두 구포국수, 파워링크·플레이스 캠페인 2개 운영 중). **chang-hee.kim 비즈채널 없음 → 법률사무소 광고 집행 불가.** 다음 단계는 사용자 결정 필요: 법률사무소 명의 신규 광고 계정 개설(권장) 또는 기존 계정에 비즈채널 추가 — 어느 쪽이든 변호사 업종 서류 심사 + 본인인증 필요. 계정 준비되면 API로 캠페인 생성 가능(계획: `저가클릭광고_계획_2026-07-17.md`).
  - **저가 클릭광고 계획**(전체: `저가클릭광고_계획_2026-07-17.md`, 미커밋 로컬 문서): 입찰가 API 실측 결과 법률 메인 키워드는 최저 노출가 9.7만원대로 70원 불가. 70원 가능 구역 3곳 확정 — ①브랜드(김창희변호사, 전 순위 70원) ②가맹 니치(가맹점분쟁·가맹금반환 등 모바일 70원) ③교권보호위원회(월 6,820회 검색인데 PC 10위 280원 — 최대 발견, 칼럼 선발행 후 광고 권장). 캠페인 3개 구조·예산(월 1~9만원)·변협 규정 문안 주의 포함. 다음 단계는 광고주센터 업종 서류 심사(사용자 본인인증 필요).

## 2026-07-26 — 불법사채 칼럼 3편 + 대출무효나라 카드 철수

**결정.** 준비 중이던 "대출무효나라"를 독립 서비스로 만들지 않고, (1) 부산회생프로 가이드 1페이지 + (2) 본사이트 칼럼 3편으로 대체했다. 서비스 섹션의 "대출무효나라 준비 중" 카드는 제거. (같은 날 "안전이별" 카드도 이별119로 대체되어 제거 — 이제 준비 중 카드는 없다.)

**이유.** 네이버 검색광고 API 실측 결과 '무효' 키워드는 검색량이 사실상 0(월 20회 미만)이고, 실제 수요는 "채무탕감제도"(6,630)·"채무조정"(4,180)에 있다. 불법사채 계열 CPC는 모바일 1위 기준 7만~8만원대로 개인회생보다 비싼데, 타깃은 지불능력이 낮고 금감원·법률구조공단 채무자대리인 무료지원(1332·132)이 이미 존재한다. → 광고비 0원으로 검색·AI 인용만 가져가는 콘텐츠 전략이 맞다고 판단.

**칼럼 3편 (모두 2026-07-26).**
- `2026-07-26-busan-illegal-loan-void` (민사·채권) — 개정 대부업법 무효 요건. 연 60% 초과는 원금까지 무효(§8의2①), 미등록 업자는 이자약정 무효(§11). "무효 ≠ 자동 소멸"과 실제 이자율 환산법을 강조.
- `2026-07-26-busan-illegal-debt-collection-free-lawyer` (민사·채권) — 채무자대리인 무료지원 안내. 우리 사무소로 오라고 하지 않고 1332·132를 먼저 안내한다. 대신 "추심 중단 ≠ 채무 정리"로 연결.
- `2026-07-26-busan-illegal-loan-already-paid` (회생·파산) — 부당이득반환의 회수 현실(대포통장·차명으로 집행 곤란)을 솔직하게 쓰고, "이미 나간 돈보다 앞으로 나갈 돈을 막는 것"으로 우선순위를 제시.

**톤 원칙.** 이 분야는 "다 돌려받게 해드립니다"류 광고가 많다. 변호사 광고규정상 단정 표현이 위험할 뿐 아니라 실제로도 회수가 어려운 사건이 많으므로, 세 편 모두 한계를 명시하는 방향으로 썼다. 이것이 오히려 차별점이 된다고 판단.

**연결 구조.** 칼럼 3편 → 부산회생프로 `guide-illegal-loan` → 자가진단 → 상담. 광고 없이 검색·AI 인용으로만 유입을 받는다.

### 2026-07-26 (추가) — 불법사채 3부작 네이버 블로그 원고(OSMU)

웹 칼럼 3편을 네이버 블로그용으로 리라이팅해 `naver-blog/`에 저장. 이별119 프로젝트의 `naver-blog/` 패턴을 따랐다(README + 번호 원고).

- **복붙 금지 이유.** 같은 글을 양쪽에 올리면 유사문서로 불이익. 구조·도입·문장을 다시 썼고, 웹 칼럼 대비 중복도를 12자 연속 shingle 기준으로 측정해 **16.3% / 19.0% / 13.1%** 로 확인(25% 미만 유지). 2편은 초안이 26.8%였고 겹치는 문장 5개를 찾아 교체.
- **발행 순서 설계.** 검색량이 가장 큰 "채무탕감제도"(6,630)를 3편에 배치. 1·2편에서 신뢰를 쌓고 3편에서 상담을 받는 구조. 2~3일 간격 발행 권장(C-Rank 주제 신뢰도).
- **광고규정.** 원고 내 "무료"는 전부 국가의 채무자대리인 지원 제도를 가리킨다. 우리 사무소 상담료를 무료·할인으로 표방한 표현은 없음(기계 검사로 확인). '최고'는 "법정 최고금리"라는 법률 용어라 오탐.
- **연결 구조.** 블로그 → chang-hee.kim / busan-hoiseng.pro 링크 + 1660-4452. 국내 검색은 블로그가, 글로벌 AI 인용은 소유 도메인이 맡는 분업.

### 2026-07-26 (추가) — 유입경로 추적 도입 + 오매칭 키워드 중지

**배경.** "다음에 뭘 할까" 논의 중 광고 실적을 실측했더니, 최근 30일 광고비 10만원(구포국수 제외) 중 상위 3개 키워드가 클릭 7번에 5만원을 쓰고 있었다. 그런데 **그 클릭이 상담으로 이어졌는지 확인할 방법이 없었다.** 그래서 새 서비스를 만들기 전에 측정부터 붙였다.

**중요한 인식 교정.** 처음엔 CTR(클릭률)이 낮은 키워드를 문제로 봤는데, 대표 지적대로 **노출은 공짜이고 돈은 클릭에만 나간다.** 따라서 봐야 할 것은 "클릭률이 낮은 키워드"가 아니라 **"돈을 썼는데 고객이 아닌 클릭"**이다. 이 기준으로 다시 분류했다.

| 분류 | 내용 | 30일 비용 |
|---|---|---|
| ① 반대편 손님 | 서비스와 의도가 정반대 | 약 6,700원 |
| ② 혼자 처리할 사람 | 탄원서·반성문·압류신청·계산기 = 양식만 받고 감 | 약 45,000원 |
| ③ 진짜 손님·비싼 단가 | 떼인돈 계열, 클릭당 8,229원 | 약 33,000원 |

**한 일 1 — 유입 기록(`js/attribution.js`).**
- 첫 방문 시 네이버 광고 파라미터(`n_query`=실제 검색어, `n_keyword`=입찰 키워드 등) + UTM + referrer를 localStorage에 저장. **first-touch를 덮어쓰지 않는다** — 광고로 들어와 여러 페이지 돌다 상담해도 최초 경로가 남아야 하므로.
- 전 페이지(83개) head에 삽입. 폼 제출 시 `attr`로 동봉 → `api/reserve.js`가 **상담 알림 문자에 "유입경로" 한 줄** 추가.
- **별도 대시보드를 만들지 않은 이유.** 대표가 이미 상담 문자를 받고 있다. 거기에 한 줄 넣으면 새로 배울 것도, 로그인할 곳도 없다. GA·Firestore를 붙이는 것보다 실제로 쓰일 확률이 높다.
- puppeteer로 실제 브라우저 검증 완료(광고 진입 → 3페이지 경유 → 상담 폼에서 최초 검색어·키워드·랜딩 유지 확인).

**한 일 2 — 네이버 자동추적 활성화.** "변호사 김창희" 캠페인 `trackingMode`를 `AUTO_TRACKING_MODE`로. `fields=trackingMode`는 1002로 거부되어 **fields 없이 전체 객체 PUT**으로 우회(전역 CLAUDE.md에 기록). 나머지 캠페인은 해당 사이트에 추적 스크립트가 없어 아직 껐다 — **스크립트를 먼저 붙인 뒤 켜야 의미가 있다.**

**한 일 3 — ① 분류 키워드 중지.** 삭제가 아닌 `userLock=true`(일시중지)라 언제든 되돌릴 수 있다. GET으로 재확인 완료.

| 키워드 | 캠페인/그룹 | 왜 껐나 |
|---|---|---|
| 신속채무조정 | 받아드림_채권추심 | 받아드림은 **돈 받아주는** 서비스인데 검색자는 **못 갚는** 사람. 46클릭 전부 헛돈 |
| 신용회복위원회채무조정 | 받아드림_채권추심 | 같은 이유 |
| 압류범위변경신청 | 김창희/05_롱테일_회생채무 | 부산회생프로에도 같은 키워드가 있어 **자사 캠페인끼리 중복 입찰**. 회생 사이트로 일원화 |
| (파산이란) | 김창희/02_회생채무절차 | 이미 중지 상태였음 |

절감은 월 약 5,700원으로 크지 않다. **진짜 판단 대상은 ②의 45,000원인데, 이건 한 달치 유입 기록이 쌓여야 자를 수 있다.** 그때 "탄원서 양식으로 들어온 사람이 실제 상담을 했는가"를 문자 기록으로 세면 된다.

**되돌리는 법.** `PUT /ncc/keywords?fields=userLock` + body `[{"nccKeywordId":..,"nccAdgroupId":..,"userLock":false}]`. 키워드 ID는 위 표의 이름으로 `/ncc/keywords?nccAdgroupId=..` 조회해 찾는다.
