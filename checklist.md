# 법률사무소 청송 웹사이트 고도화 — 체크리스트

> 진행하면서 `[ ]` → `[x]` 로 체크. 각 Phase 끝나면 배포·확인 후 다음으로.
> 상세 결정 배경은 `context-notes.md` 참고.

## Phase 1 — 문의 폼 제거, 전화·카톡 중심 전환 ✅ 완료
- [x] 1-1. 현재 문의 폼 영역(`#contactForm`, `#contactSuccess`) 위치 파악
- [x] 1-2. 폼 자리에 전화·카카오톡·네이버 예약 3단 CTA 카드로 교체
- [x] 1-3. `main.js`의 EmailJS·폼 제출 관련 코드 제거
- [x] 1-4. EmailJS CDN `<script>` 제거
- [x] 1-5. 클립보드 복사 로직·"성공" 화면 관련 잔여 코드 정리
- [x] 1-6. 잔여 참조 0건 확인 (contactForm/emailjs/kakaoRedirect 등)
- **검증**: 폼 흔적 없음 · 헤드리스 스크린샷으로 CTA 카드 정상 렌더 확인 ✅
- **참고**: `#booking` 섹션이 이미 같은 채널 CTA 보유 → `#contact`는 FAQ 이후 클로징 CTA로 차별화(3단 카드). 버튼 id 부여(contactCallBtn/KakaoBtn/BookingBtn)로 Phase 2 GA 연결 준비 완료.

## Phase 2 — GA4 성과 측정 ✅ 완료
- [x] 2-1. GA4 측정 ID 확보: **G-LZFSX216W1**
- [x] 2-2. gtag.js 스크립트 `<head>` 상단 삽입 (index.html + 404.html)
- [x] 2-3. 전환 이벤트 연결: main.js 위임 리스너로 tel:/pf.kakao.com//booking 클릭 → `contact_click`(method: phone/kakao/naver_booking)
- [x] 2-4. sw.js 영향 없음(외부 스크립트, 캐시 대상 아님) 확인
- **검증**: 헤드리스 테스트로 gtag 함수·config·page_view 수집요청 전송·3종 전환 이벤트 발생 모두 확인 ✅
- **GA UI 후속(사용자)**: GA4 → 관리 → 이벤트 → `contact_click`을 **주요 이벤트(전환)** 로 표시하면 전환 집계됨.

## Phase 3 — Tailwind 정적 빌드 + 이미지 최적화 ✅ 완료
- [~] 3-1. Lighthouse 점수 측정 (전) — 측정 CLI 미설치로 생략, 정성 비교로 대체
- [x] 3-2. Tailwind v3.4.19 CLI 도입, `tailwind.config.js` + `src/input.css` 구성
- [x] 3-3. 사용 클래스 스캔 → `css/tailwind.min.css`(24.9KB) 빌드
- [x] 3-4. Play CDN `<script>` 제거(index.html, 404.html), 빌드 CSS 링크 + 불필요 preconnect 제거
- [x] 3-5. CDN vs 빌드 섹션별 스크린샷 비교 — expertise/booking/location/hero/about/contact/404 전부 픽셀 동일 확인
- [x] 3-6. hero-bg(48→19.5KB), lawyer-profile(55.6→26.9KB) webp 변환. jpg fallback 유지(@supports image-set / <picture>)
- [x] 3-7. sw.js 캐시 갱신: tailwind.min.css·webp 추가, CACHE_NAME v4→v5
- [~] 3-8. Lighthouse 점수 측정 (후) — 생략. 핵심 개선: 런타임 ~3MB Play CDN JS 제거 + 이미지 58KB 절감
- **검증**: 화면 동일 ✅ · CDN JS 제거 ✅ · webp 적용 렌더 확인 ✅
- **보류 결정 필요**: 빌드 산출물을 로컬 빌드 후 커밋(현재 방식) 유지. Vercel은 build 스크립트명이 "build"가 아니라(build:css) 자동 빌드 안 함 → 정적 서빙. 다음 배포 시 확인 권장.
- **미사용 dead file(미삭제, 알림만)**: 루트 `정장2.jpg`, `images/naver-booking-button.png` — 어디서도 참조 안 됨.
- **로고 webp 미적용(의도)**: 5곳 사용·파비콘 webp 불가·캐시 1회로 실익 낮아 제외.

## 사전 골드/네이비 클래스 버그 수정 ✅ 완료
- [x] tailwind.config.js `theme.extend.colors`에 navy/gold 등록 (인라인 --navy/--gold와 동일 값)
- [x] 재빌드 → bg-gold(8)·border-gold(2)·border-navy(2)·hover:bg-gold(4)·hover:text-navy(16)·focus:ring-navy(4) 등 활성화
- [x] 검증: contact/hero 골드 구분선 표시 확인, about 프로필 네이비 프레임 표시 확인, 회귀 없음
- **효과**: 죽어있던 골드 구분선·장식 테두리·네비 hover·모달 골드 버튼(흰글씨 무배경이던 것) 정상화

## SEO / GEO (2026) ✅ 완료
- [x] robots.txt: AI 크롤러 명시 허용 (GPTBot·OAI-SearchBot·ChatGPT-User·PerplexityBot·ClaudeBot·Google-Extended·Applebot-Extended 등)
- [x] llms.txt 신규 생성 (llmstxt.org 스펙: H1+요약+업무분야/상담/기본정보 링크 섹션)
- [x] JSON-LD 강화: founder Person에 knowsAbout·hasCredential(변호사/가맹거래사)·sameAs, LegalService에 knowsAbout·hasOfferCatalog(4개 서비스)·areaServed(City/구) 추가
- [x] sitemap.xml lastmod 2026-06-02 갱신
- [x] 검증: JSON-LD 3블록(LegalService/FAQPage/Attorney) 전부 유효, robots/llms/sitemap 200 서빙
- **참고**: GPTBot은 학습용 크롤러 — 학습 데이터 제공이 싫으면 차단 가능(현재는 노출 우선으로 허용). 후속 권장: 구글 서치콘솔/네이버 서치어드바이저에 sitemap 제출, 실제 콘텐츠(칼럼/판례 해설) 추가로 인용 소스화.

## Phase 4 — 유지보수성 ✅ 완료
- [x] 4-1. inline `onclick` 22개 → `data-action` 속성 + main.js 단일 위임 디스패처로 이전
  - toggle-menu(7)·toggle-faq(7)·open-modal(4, data-modal)·close-modal(2)·scroll-top(1)·accept-cookies(1)
  - openModal/closeModal은 index.html 인라인 스크립트 전역 함수를 디스패처가 호출
- [x] 검증: 헤드리스로 메뉴·모달 열기/닫기·FAQ·쿠키·스크롤탑 전부 동작 확인 (ALL_PASS)
- [ ] 4-2. (검토 보류) 긴 index.html 섹션 분리 — 빌드 없이 어려워 현 단계 미진행

---

## 노출 감소 대응 (2026-07-16) ✅ 완료 (일부 네이버 검토 대기)
- [x] 서치어드바이저 콘텐츠 노출/클릭 리포트 분석 — 30일 누적은 지난달 대비 대폭 증가(노출 +709.6%, 클릭 +619%), 7/1~7/9 발행 몰이로 생긴 "신규 글 프리미엄" 소멸이 원인, 기술적 결함 아님
- [x] IndexNow 자동 통지 구현·배포: `.github/workflows/indexnow.yml` (push 시 변경된 columns/precedents/practice/index/press/reserve URL만 추출해 searchadvisor.naver.com + api.indexnow.org에 통지). 기존 키 파일(`0924f93c083623f0aac81ce808ed9337.txt`, 루트에 이미 배포돼 있던 것) 재사용, 별도 시크릿 불필요. GitHub Actions 실제 실행으로 동작 검증(success)
- [x] 미통지 상태였던 기존 페이지 55건(sitemap 53 + 7/16 신규 2건) 1회성 수동 IndexNow 제출 완료 (양쪽 엔드포인트 HTTP 200)
- [x] "김창희변호사"(붙여쓰기) 키워드 노출 956/클릭 4/CTR 0.4% 원인 진단 — 순위 문제가 아니라 네이버 인물정보 지식패널이 검색 의도를 화면 안에서 대신 충족시켜 클릭이 안 나오는 구조. 문제 아님(오히려 브랜드 신호)
- [x] 인물정보 카드 확인 결과 "공식홈페이지"는 이미 `chang-hee.kim`으로 정확히 연결되어 있었음
- [x] 인물정보 수정신청 진행 지원: 한자명 金昌熙 확정, 영문명 필드 오류(도메인이 잘못 들어가 있던 것) 발견해 수정 안내, 출처 URL 4건 추천(중앙일보·cpmadang·법률신문·엘파인드 — `외부인용_링크목록.md` 기반), 요청사항 문구 작성
- [x] 2026-07-16: 사용자가 네이버 인물정보 수정신청 제출 완료 (등록신청 버튼 클릭)
- **대기**: 네이버 측 검토·반영(통상 수일~수주 소요). 반려 시 `search_people@naver.com` 문의
- **참고**: 브라우저 확장·WebFetch·WebSearch(도메인 필터) 3개 도구 모두 `naver.com`이 Anthropic 크롤러에 원천 차단되어 있음을 확인 — 향후 네이버 화면 확인은 사용자가 캡처해서 공유하는 방식으로만 가능

## 노출/클릭 부진 진짜 원인 재진단 (2026-07-16, 후속) ✅ 완료
- [x] title/description 전수 점검(칼럼32+판례13) — 중복 0건, canonical/noindex/robots 전부 정상. 기술적 결함 아님
- [x] **핵심 발견: 백링크 사실상 0.** 가장 구체적인 브랜드 검색어로도 chang-hee.kim이 전혀 안 뜨고 경쟁사·디렉토리만 노출. sameAs로 걸어둔 lfind.kr 프로필조차 실제 홈페이지 하이퍼링크 없음(텍스트 언급뿐). 도메인은 4개월(2026.3.15 등록)이지만 실제 콘텐츠 축적은 6주(6/2~)뿐이라 신뢰도 축적 기간도 짧음 → 노출/클릭 부진의 실질 원인은 콘텐츠·기술이 아니라 **외부 백링크·도메인 신뢰도 부족**
- [x] www 리다이렉트 307(임시)→301/308(영구) 수정: `vercel domains add www.chang-hee.kim lawchungsong` + `vercel.json`에 `has: host` 매칭 permanent redirect 규칙 추가·배포. 신규 경로 테스트로 308 정상 작동 확인. 루트(`/`) 경로는 기존 엣지 캐시 잔존으로 당장은 200 응답 — 자연 만료 대기, 추가 재시도 불필요
- **후속 권장**: lfind.kr·bizno 등 디렉토리 프로필에 실제 홈페이지 링크 등록 요청, 소속 협회·단체 페이지에 사이트 링크 확보 — 콘텐츠 발행보다 이 백링크 확보가 노출 개선의 실질 레버
- [x] 2026-07-17: lfind.kr 고객센터(help@lfind.kr)에 홈페이지 링크 추가 요청 메일 발송 완료 (Gmail 커넥터 권한 부족으로 초안 자동생성은 실패 → 메일 본문만 제공, 사용자가 직접 발송)
- **참고**: Gmail MCP 커넥터가 읽기 전용 스코프만 허용돼 있어 초안 작성(create_draft)도 권한 부족으로 실패함. 이후 세션에서 이메일 초안 자동화가 필요하면 claude.ai 커넥터 설정에서 Gmail 권한 확장 필요

## SEO·AEO·GEO 종합 점수화 + bizno 백링크 요청 (2026-07-17) ✅ 완료
- [x] 네이버 SEO 가이드 + SEO·GEO·AEO 통합 가이드 기준으로 전 항목 재점검, 카테고리별 점수화(아티팩트로 제공) — 종합 70/100, 기술 토대 92·AEO 88·GEO 83·네이버 특화 78·**외부 권위·백링크 22**(가장 낮음, 전체를 끌어내리는 항목)
- [x] www 리다이렉트 후속 확인: 실제 콘텐츠 경로는 308 정상. 홈 루트(`/`) 하나만 Vercel 정적파일 우선 서빙으로 200 잔존 확인(24시간 경과 후에도 동일 — 캐시 아님). 루트 전용 규칙 추가 시도했으나 동일 결과, Vercel 대시보드 레벨 설정 필요 판단 → 추가 재시도 중단, canonical 태그로 리스크 상쇄 중
- [x] bizno.net 홈페이지 링크 확인 — lfind.kr과 동일하게 "홈페이지"/"IR홈페이지" 항목은 있으나 빈 텍스트, 링크 없음
- [x] bizno.net "고객문의(VOC)" 폼에 홈페이지 등록 요청 제출 완료(브라우저 자동화로 직접 입력·제출). 제출 후 `/voc_proc` 처리 페이지로 이동은 확인했으나, 해당 페이지가 로딩 행에 걸려 최종 완료 메시지는 육안 확인 못함 — URL 전환 자체가 서버 접수의 증거
- **참고**: WebFetch로는 VOC 폼의 실제 입력 필드 구조를 못 읽어냄(JS 렌더 폼) → browser 자동화로 전환해 해결. naver.com과 달리 bizno.net·lfind.kr은 브라우저·WebFetch 모두 접근 가능
- [x] 2026-07-17: 사용자가 동일 요청을 본인 이메일(jeonwoochul0515@gmail.com)로 직접 한 번 더 제출(1차 자동 제출의 완료 화면이 안 보여 재확인 차원). 총 2건 접수된 상태

---

## OG 이미지 크기 태그 보강 (2026-07-17) ✅ 완료
- [x] index.html에만 있던 `og:image:width`/`og:image:height`(1200x630)가 칼럼32+판례13+업무분야5+press+reserve, 총 55페이지에 누락된 것 발견
- [x] 실제 OG 이미지 55개 전수 확인 — 전부 1200x630로 통일되어 있어 일괄 추가 안전 확인
- [x] 스크립트로 55개 파일 일괄 추가, HTML 구조 무결성(중복/누락 0건) 검증 후 배포, 라이브 반영 확인

---

## 백링크 확보 — 전 채널 조사 및 순차 요청 (2026-07-17) 진행 중
- [x] 114.co.kr, 굿피플인터내셔널 외에 가능한 모든 백링크 경로 조사: 법조인 디렉토리(대한변협 나의변호사·법률신문 한국법조인대관·로톡), 지도서비스(카카오맵·구글비즈니스프로필), 소속단체(부산지방변호사회·노무현재단 부산지역위원회)
- [x] 114.co.kr "1:1 이메일문의" 폼(로그인 불필요 경로)으로 홈페이지 등록 요청 제출 완료 — 오류신고 폼은 로그인 필요해 대신 사용. 제출 중 confirm 다이얼로그로 브라우저 자동화가 멈춰 사용자가 직접 "확인" 클릭, 이후 메인페이지로 정상 이동 확인
- [x] 굿피플인터내셔널(help@goodpeople.or.kr) 홈페이지 링크 추가 요청 메일 발송 완료(사용자 발송)
- **참고**: 114.co.kr 오류신고 폼은 로그인 필요 — 계정 로그인은 대신 할 수 없는 영역(자격증명 입력 금지 원칙)이라 이메일문의 경로로 우회함
- **후속 조사 필요(다음 순서)**: 로톡·대한변협 나의 변호사·법률신문 한국법조인대관에 기존 프로필이 있는지, 있다면 홈페이지 필드 추가 가능한지 확인
- **사용자 직접 처리 필요(사업자등록증 제출 등 본인인증 필요)**: 카카오맵 매장등록, 구글 비즈니스 프로필 등록 — 검색 결과 미노출 확인됨

---

## Lighthouse 성능 측정 + 폰트 최적화 (2026-07-17) ✅ 완료
- [x] Lighthouse를 이 프로젝트에서 처음 실제 측정(`npx lighthouse`, Chrome 임시 설치·프로젝트 종속성 추가 없음). 최초 결과: Performance 55점, FCP/LCP 약 24초. Accessibility 95·Best Practices 100·SEO 100
- [x] 원인 특정: Pretendard 정적 폰트 6종(4.68MB)을 CDN에서 개별 로드 중이었음. font-family가 이미 "Pretendard Variable"을 1순위로 지정해뒀으나 실제 링크는 static 빌드라 매칭 안 되고 폴백(Pretendard, 9종 중 6종 다운로드)되고 있었음
- [x] 1차 조치: jsdelivr variable 빌드(단일 파일 2.06MB)로 전환 → 5.25MB→2.6MB, 24초→14초. 57개 파일 전체 적용, 라이브 반영·화면 확인
- [x] Font Awesome 아이콘도 동일 문제 발견: 아이콘 66종만 쓰는데 cdnjs 풀세트(176KB) 로드 중. fonttools로 66종만 담은 서브셋(8.3KB, 94%↓) 생성해 `fonts/fa-solid-subset.woff2`로 자체 호스팅. 마크업(`<i class="fa-...">`) 변경 없이 later-@font-face 우선순위 트릭으로 무거운 CDN 폰트 대체. fa-regular 단독 사용 1건은 fa-solid로 통일해 폰트 패밀리 하나로 축소
- [x] 재측정: 2.6MB→2.4MB, 14초→12초. **하지만 Performance 점수는 55점에서 그대로** — Lighthouse 채점 곡선상 12초든 24초든 "허용 임계치(4초)"를 훨씬 초과해 둘 다 최하점 구간이라 점수엔 아직 안 잡힘(사용자에게 이유 설명함)
- [x] 사용자 질문("한글 폰트를 왜 들고 있나") 받고 커스텀 웹폰트 자체의 존재 이유(기기별 시스템 폰트 차이로 인한 브랜드 불일치 방지) 설명, 두 가지 선택지(①시스템 폰트로 완전 전환 ②실사용 글자만 서브셋) 제시
- [x] **사용자가 ①(시스템 폰트 전환) 선택, 단 가독성 유지 조건**: Pretendard CDN 링크·jsdelivr preconnect 전체 제거(57개 파일), font-family를 플랫폼별 최상급 한글 시스템 폰트 순서로 교체 — `-apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Malgun Gothic", "맑은 고딕", "Noto Sans KR", "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`. 폰트 다운로드 0으로 완전 제거
- [x] 제거 스크립트가 남긴 줄바꿈 병합 잔여물(56개 파일)을 별도 스크립트로 전수 정리, 배포 후 페이지 텍스트 전체 정상 로드 확인
- **참고**: 배포 후 화면 스크린샷 도구가 일시적으로 오류(viewport 0x0 인식) 나서 시각적 확인은 못함 — 순수 CSS 폰트 변경이라 레이아웃 영향 없음, 코드는 깨끗이 검증됨. 사용자가 직접 한 번 열어보고 확인 권장
- [x] **최종 재측정 결과**: Performance 55→**62점**(실제로 점수 상승 확인), FCP 24초→**1.9초**, 총 전송량 5.25MB→**0.38MB**(93%↓), 요청수 25→17개. 남은 병목은 Total Blocking Time 780ms(GTM 등 JS 실행) — 폰트 이슈는 사실상 해소
- **후속(선택)**: Total Blocking Time 낮추려면 Google Tag Manager 지연 로딩 등 JS 최적화 여지 있음, 지금 성과로도 충분하면 보류 가능

---

## 미해결 결정 / 입력 대기
- [ ] 화면 육안 확인 (스크린샷 도구 오류로 이번 세션에 확인 못함, 텍스트 렌더링은 정상 확인됨)
- [ ] 네이버 인물정보 수정신청 검토 결과 확인 (제출일 2026-07-16)
- [ ] lfind.kr 홈페이지 링크 반영 여부 확인 (요청일 2026-07-17)
- [ ] bizno.net 홈페이지 링크 반영 여부 확인 (요청일 2026-07-17, 2건 접수)
- [ ] 114.co.kr 홈페이지 링크 반영 여부 확인 (요청일 2026-07-17)
- [ ] 굿피플인터내셔널 홈페이지 링크 반영 여부 확인 (요청일 2026-07-17)
- [ ] www 루트(`/`) 리다이렉트 — Vercel API 토큰이 CLI 내부 갱신 방식이라 직접 호출 불가 확인. 대시보드(Project→Domains→www.chang-hee.kim)에서 사용자가 직접 설정해야 함
- [ ] 카카오맵·구글 비즈니스 프로필 등록 — 사업자등록증 제출 필요해 사용자가 직접 진행
- [x] ~~GA4 측정 ID~~ → 이미 반영 완료 확인(G-LZFSX216W1, index.html 2곳). 오래된 미해결 항목 정리
- [x] ~~빌드 도구 배포 흐름 결정~~ → 이미 "로컬 빌드 후 정적 푸시"로 확정·운영 중(package.json build:css 확인). 오래된 미해결 항목 정리
