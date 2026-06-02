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

## Phase 4 — 유지보수성 (선택, 천천히)
- [ ] 4-1. inline `onclick` 22개 → `main.js` 이벤트 리스너로 이전
- [ ] 4-2. (검토) 긴 index.html 섹션 분리 가능성

---

## 미해결 결정 / 입력 대기
- [ ] GA4 측정 ID (Phase 2 시작 전 필요)
- [ ] 빌드 도구 도입에 따른 배포 흐름 변경 — Vercel 빌드 설정 vs 로컬 빌드 후 정적 푸시
