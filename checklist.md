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

## Phase 2 — GA4 성과 측정
- [ ] 2-1. GA4 측정 ID 확보 (G-XXXXXXXXXX) — **사용자 입력 필요**
- [ ] 2-2. GA4 gtag 스크립트 `<head>`에 삽입
- [ ] 2-3. 전환 이벤트 연결: 전화 클릭 / 카톡 클릭 / 네이버 예약 클릭
- [ ] 2-4. 서비스워커 캐시 목록(sw.js) 영향 확인
- **검증**: GA4 실시간 보고서에 내 방문·클릭 이벤트 잡힘

## Phase 3 — Tailwind 정적 빌드 + 이미지 최적화
- [ ] 3-1. Lighthouse 점수 측정 (전 — 기준값 기록)
- [ ] 3-2. Tailwind CLI 도입, `tailwind.config` + input.css 구성
- [ ] 3-3. 사용 중인 클래스 스캔 → 정적 CSS 빌드 산출
- [ ] 3-4. Play CDN `<script src="cdn.tailwindcss.com">` 제거, 빌드 CSS 링크
- [ ] 3-5. 화면이 전과 100% 동일한지 육안 비교
- [ ] 3-6. 히어로/프로필 이미지 webp 변환 + 적정 크기
- [ ] 3-7. sw.js 캐시 자산 목록 갱신 (새 CSS·webp 반영, CACHE_NAME 버전업)
- [ ] 3-8. Lighthouse 점수 측정 (후 — 개선 확인)
- **검증**: 화면 동일 · CDN JS 제거됨 · Performance 점수 상승

## Phase 4 — 유지보수성 (선택, 천천히)
- [ ] 4-1. inline `onclick` 22개 → `main.js` 이벤트 리스너로 이전
- [ ] 4-2. (검토) 긴 index.html 섹션 분리 가능성

---

## 미해결 결정 / 입력 대기
- [ ] GA4 측정 ID (Phase 2 시작 전 필요)
- [ ] 빌드 도구 도입에 따른 배포 흐름 변경 — Vercel 빌드 설정 vs 로컬 빌드 후 정적 푸시
