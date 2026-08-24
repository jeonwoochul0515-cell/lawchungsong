/* 다인 상담 챗봇 위젯 — 법률사무소 청송 chang-hee.kim
   정본(이별119 "지안")을 Vercel + 정적 HTML 환경에 맞춰 바닐라 JS로 재작성한 것.
   핵심 원칙
     · 능동성 최우선 — 손님이 보는 화면마다 먼저 말을 건다. 억제는 "같은 화면 2분 쿨다운" 하나뿐이고
       캐릭터를 잠재우는 끄기 스위치는 두지 않는다.
     · 대화창에 적힌 번호는 접수가 아니다 — 감지되면 접수 폼을 번호까지 채워 자동으로 연다.
     · 대화는 서버에 저장하지 않는다. 이력은 sessionStorage가 들고 매 요청 함께 보낸다. */
(function () {
  'use strict';

  var IMG = '/images/dain/';
  var API = '/api/chat';
  var RESERVE_API = '/api/reserve';
  var TEL = '1660-4452';

  var SS_LOG = 'dain.log';
  var SS_OPEN = 'dain.open';
  var SS_LEAD = 'dain.lead';     // 접수 완료 여부 — 이력과 같은 수명으로 보존해야 재차단 사고가 없다
  var SS_SEEN = 'dain.seen';     // 화면별 마지막 안내 시각(쿨다운)
  var LS_ATTR = 'dain.attr';     // 유입 경로(첫 방문 시 저장하고 주소창은 정리)
  var COOLDOWN = 2 * 60 * 1000;

  // ── 저장소 헬퍼 (사파리 프라이빗 등에서 throw 하므로 전부 감싼다) ──
  function ssGet(k, d) {
    try { var v = sessionStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; }
  }
  function ssSet(k, v) { try { sessionStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function lsGet(k, d) {
    try { var v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; }
  }
  function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }

  // ── 유입 경로 보존 ─────────────────────────────
  // 광고·검색으로 들어온 파라미터를 한 번 저장하고 주소창은 깨끗하게 만든다.
  (function captureAttr() {
    try {
      var q = new URLSearchParams(location.search);
      var keys = ['n_query', 'n_keyword', 'n_ad_group', 'n_rank', 'utm_source', 'utm_medium', 'utm_campaign', 'gclid'];
      var got = {};
      var found = false;
      keys.forEach(function (k) { if (q.get(k)) { got[k] = q.get(k); found = true; } });
      if (found) {
        got.ref = document.referrer || '';
        got.at = Date.now();
        lsSet(LS_ATTR, got);
        keys.forEach(function (k) { q.delete(k); });
        var url = location.pathname + (q.toString() ? '?' + q.toString() : '') + location.hash;
        history.replaceState(null, '', url);
      } else if (!lsGet(LS_ATTR, null) && document.referrer) {
        lsSet(LS_ATTR, { ref: document.referrer, at: Date.now() });
      }
    } catch (e) {}
  })();

  // ── 화면별 안내 문구 ───────────────────────────
  // 손님이 보고 있는 곳을 먼저 설명하고 말을 건다. 없는 기능은 지어내지 않는다.
  var SECTION_INTRO = {
    '#about': '여기는 김창희 변호사 소개예요. 변호사·변리사·가맹거래사 자격을 함께 가지고 있어요. 어떤 일로 알아보고 계세요?',
    '#profile': '주요 경력을 보고 계시네요. 검찰 형사조정위원, 법제처 법제자문관, 교육청 행정심판위원 같은 일을 맡아 왔어요. 궁금한 분야가 있으실까요?',
    '#expertise': '업무 분야를 보고 계시네요. 이혼·가사, 학교폭력, 형사·행정, 가맹, 회생·파산을 다뤄요. 목록에 없는 일도 편하게 말씀해 주세요.',
    '#services': '청송이 직접 만든 서비스들이에요. 학교폭력, 스토킹, 음주운전, 못 받은 돈처럼 상황에 맞는 곳으로 안내해 드릴 수 있어요.',
    '#booking': '상담 예약 칸이에요. 혹시 어떤 일인지 먼저 말씀해 주시면 제가 정리해서 함께 전달해 드릴게요.',
    '#location': '오시는 길을 보고 계시네요. 부산 연제구 법원남로15번길 10, 202호예요. 방문 전에 미리 상담 예약을 잡아 두시면 기다리지 않으셔도 돼요.',
  };
  var PAGE_INTRO = [
    [/\/practice\/divorce/, '이혼·가사 페이지를 보고 계시네요. 협의든 재판이든 상황마다 준비가 달라서요, 지금 어디까지 진행되셨는지 여쭤봐도 될까요?'],
    [/\/practice\/school-violence/, '학교폭력·소년보호 페이지네요. 학폭위는 시간이 촉박한 경우가 많아요. 혹시 통지서를 받으셨을까요?'],
    [/\/practice\/criminal/, '형사·행정 페이지를 보고 계시네요. 수사 단계인지 재판 단계인지에 따라 대응이 달라져요. 지금 어느 단계이신가요?'],
    [/\/practice\/franchise/, '가맹·프랜차이즈 페이지네요. 김창희 변호사는 가맹거래사 자격도 함께 가지고 있어요. 계약서 문제이신가요, 아니면 본사와의 분쟁이신가요?'],
    [/\/practice\/rehabilitation/, '개인회생·파산 페이지를 보고 계시네요. 채무 규모와 소득에 따라 가능한 절차가 달라요. 편하게 상황을 들려주시겠어요?'],
    [/\/columns\//, '칼럼을 읽고 계시네요. 읽으시다가 내 상황은 어떤지 궁금해지면 언제든 물어봐 주세요.'],
    [/\/press/, '언론·활동 페이지네요. 궁금한 게 있으시면 편하게 말씀해 주세요.'],
    [/\/attorney/, '변호사 소개를 보고 계시네요. 어떤 일로 상담을 알아보고 계신지 여쭤봐도 될까요?'],
    [/\/reserve/, '상담 예약 페이지네요. 어떤 일인지 먼저 말씀해 주시면 제가 정리해서 함께 전달해 드릴게요.'],
  ];

  function greetingByEntry() {
    var attr = lsGet(LS_ATTR, null) || {};
    var q = attr.n_query || attr.n_keyword || '';
    // 검색어가 지나치게 길거나 숫자 덩어리면 사람 검색어가 아니므로 쓰지 않는다
    if (q && q.length <= 20 && !/\d{7,}/.test(q)) {
      return '"' + q + '" 때문에 찾아오셨군요. 그 부분 편하게 말씀해 주시면 제가 정리해 드릴게요.';
    }
    var h = new Date().getHours();
    if (h >= 22 || h < 5) {
      return '늦은 시간까지 마음이 편치 않으셨나 봐요. 지금 편하게 말씀해 주시면 제가 정리해 둘게요.';
    }
    var ref = (attr.ref || '') + '';
    if (/naver|google|daum|bing/.test(ref)) {
      return '검색해서 찾아와 주셨네요. 어떤 일로 알아보고 계신지 편하게 말씀해 주시겠어요?';
    }
    var pool = [
      '안녕하세요, 법률사무소 청송 상담 챗봇 다인이에요. 어떤 일로 오셨는지 편하게 말씀해 주세요.',
      '안녕하세요, 다인이에요. 무슨 일이 있으셨는지 편하게 들려주시겠어요?',
      '안녕하세요. 어떤 일로 알아보고 계신지 말씀해 주시면 제가 정리해 드릴게요.',
    ];
    return pool[Math.floor(Math.random() * pool.length)];
  }

  // ── 상태 ───────────────────────────────────────
  var log = ssGet(SS_LOG, []);          // [{role, content}]
  var leadDone = ssGet(SS_LEAD, false);
  var seen = ssGet(SS_SEEN, {});
  var open = ssGet(SS_OPEN, false);
  var busy = false;
  var expression = 'base';
  var els = {};
  var bubbleTimer = null;

  function officeOpen() {
    var d = new Date();
    var day = d.getDay();
    var h = d.getHours();
    return day >= 1 && day <= 5 && h >= 9 && h < 18;
  }

  // ── DOM 만들기 ─────────────────────────────────
  function build() {
    var launcher = document.createElement('button');
    launcher.className = 'dain-launcher';
    launcher.type = 'button';
    launcher.setAttribute('aria-label', '상담 챗봇 다인 열기');
    // 평소에는 눈 깜빡임 영상, 표정이 바뀌면 그 표정 이미지를 위에 덮는다
    launcher.innerHTML =
      '<video class="dain-launcher__img dain-launcher__vid" src="' + IMG + 'idle.mp4" ' +
        'poster="' + IMG + 'base.jpg" autoplay muted loop playsinline aria-hidden="true"></video>' +
      '<img class="dain-launcher__img dain-launcher__face" src="' + IMG + 'base.jpg" alt="상담 챗봇 다인" hidden>' +
      '<span class="dain-launcher__badge"></span>';
    launcher.addEventListener('click', function () { openPanel(); });
    document.body.appendChild(launcher);
    els.launcher = launcher;
    els.launcherVid = launcher.querySelector('.dain-launcher__vid');
    els.launcherImg = launcher.querySelector('.dain-launcher__face');

    var panel = document.createElement('div');
    panel.className = 'dain-panel';
    panel.style.display = 'none';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', '상담 챗봇 다인');
    panel.innerHTML =
      '<div class="dain-head">' +
        '<img class="dain-head__img" src="' + IMG + 'base.jpg" alt="">' +
        '<div class="dain-head__meta">' +
          '<div class="dain-head__name">다인</div>' +
          '<div class="dain-head__role">법률사무소 청송 상담 챗봇</div>' +
        '</div>' +
        '<button class="dain-head__close" type="button" aria-label="닫기">×</button>' +
      '</div>' +
      '<div class="dain-log"></div>' +
      '<div class="dain-quick"></div>' +
      '<div class="dain-input">' +
        '<textarea rows="1" placeholder="어떤 일인지 편하게 적어 주세요" aria-label="메시지 입력"></textarea>' +
        '<button type="button">전송</button>' +
      '</div>' +
      '<div class="dain-cta">' +
        '<button class="dain-cta--primary" type="button">상담 예약하기</button>' +
        '<a class="dain-cta--ghost" href="tel:' + TEL + '">전화 ' + TEL + '</a>' +
      '</div>';
    document.body.appendChild(panel);

    els.panel = panel;
    els.headImg = panel.querySelector('.dain-head__img');
    els.log = panel.querySelector('.dain-log');
    els.quick = panel.querySelector('.dain-quick');
    els.ta = panel.querySelector('textarea');
    els.send = panel.querySelector('.dain-input button');
    els.cta = panel.querySelector('.dain-cta');

    panel.querySelector('.dain-head__close').addEventListener('click', closePanel);
    els.cta.querySelector('.dain-cta--primary').addEventListener('click', function () { openForm(''); });

    // 전송 — 비제어 textarea + 네이티브 리스너 + 중복 잠금 + 한글 IME 가드
    els.send.addEventListener('click', submit);
    els.ta.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
        e.preventDefault();
        submit();
      }
    });
    els.ta.addEventListener('input', function () {
      els.ta.style.height = 'auto';
      els.ta.style.height = Math.min(els.ta.scrollHeight, 96) + 'px';
    });
  }

  // ── 말풍선(먼저 거는 말) ───────────────────────
  function showBubble(text) {
    if (open) { pushIntro(text); return; }   // 대화창이 열려 있으면 말풍선 대신 대화에 넣는다
    hideBubble();
    var b = document.createElement('div');
    b.className = 'dain-bubble';
    b.innerHTML = '<button class="dain-bubble__close" type="button" aria-label="닫기">×</button><span></span>';
    document.body.appendChild(b);
    els.bubble = b;
    b.addEventListener('click', function (e) {
      if (e.target.classList.contains('dain-bubble__close')) { hideBubble(); return; }
      openPanel();
      pushIntro(text);
    });
    typeInto(b.querySelector('span'), text);
    clearTimeout(bubbleTimer);
    bubbleTimer = setTimeout(hideBubble, 14000);
  }
  function hideBubble() {
    clearTimeout(bubbleTimer);
    if (els.bubble && els.bubble.parentNode) els.bubble.parentNode.removeChild(els.bubble);
    els.bubble = null;
  }

  // 한 글자씩 찍기 — 내용이 바뀔 때마다 새로 시작하므로 빈 말풍선이 생기지 않는다
  function typeInto(node, text) {
    node.textContent = '';
    var i = 0;
    (function step() {
      node.textContent = text.slice(0, ++i);
      if (i < text.length) setTimeout(step, 22);
    })();
  }

  // ── 화면 안내 ──────────────────────────────────
  function introFor(key) {
    if (SECTION_INTRO[key]) return SECTION_INTRO[key];
    for (var i = 0; i < PAGE_INTRO.length; i++) {
      if (PAGE_INTRO[i][0].test(key)) return PAGE_INTRO[i][1];
    }
    return null;
  }
  function announce(key) {
    var now = Date.now();
    if (seen[key] && now - seen[key] < COOLDOWN) return;   // 유일한 억제 규칙
    var text = introFor(key);
    if (!text) return;
    seen[key] = now;
    ssSet(SS_SEEN, seen);
    if (log.length > 0) text = '다시 와 주셨네요. ' + text;   // 재방문 인사는 안내 앞에 짧게만
    showBubble(text);
  }
  function pushIntro(text) {
    // 대화창이 열려 있을 때는 안내를 대화 흐름 안에 넣는다(말풍선이 가려지지 않도록)
    var last = log[log.length - 1];
    if (last && last.role === 'assistant' && last.content === text) return;
    log.push({ role: 'assistant', content: text });
    ssSet(SS_LOG, log);
    render();
  }

  // ── 렌더 ───────────────────────────────────────
  function render() {
    els.log.innerHTML = '';
    log.forEach(function (m) {
      var row = document.createElement('div');
      row.className = 'dain-row dain-row--' + (m.role === 'user' ? 'me' : 'dain') + (m.urgent ? ' dain-row--urgent' : '');
      var msg = document.createElement('div');
      msg.className = 'dain-msg';
      msg.textContent = m.content;
      row.appendChild(msg);
      els.log.appendChild(row);
    });
    els.log.scrollTop = els.log.scrollHeight;
    renderQuick();
  }
  function renderQuick() {
    var chips = log.length <= 1
      ? ['이혼 문제예요', '학교폭력이에요', '못 받은 돈이 있어요', '다른 일이에요']
      : [];
    els.quick.innerHTML = '';
    chips.forEach(function (c) {
      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = c;
      b.addEventListener('click', function () { els.ta.value = c; submit(); });
      els.quick.appendChild(b);
    });
  }
  function setExpression(e) {
    expression = e || 'base';
    var src = IMG + expression + '.jpg';
    if (els.headImg) els.headImg.src = src;
    // 기본 표정이면 영상(눈 깜빡임)을 보여 주고, 감정이 실리면 해당 표정 이미지로 바꾼다
    if (els.launcherVid && els.launcherImg) {
      var useVideo = expression === 'base';
      els.launcherVid.hidden = !useVideo;
      els.launcherImg.hidden = useVideo;
      if (!useVideo) els.launcherImg.src = src;
    }
  }
  function showTyping(on) {
    var old = els.log.querySelector('.dain-row--typing');
    if (old) old.parentNode.removeChild(old);
    if (!on) return;
    var row = document.createElement('div');
    row.className = 'dain-row dain-row--dain dain-row--typing';
    row.innerHTML = '<div class="dain-msg"><span class="dain-typing"><i></i><i></i><i></i></span></div>';
    els.log.appendChild(row);
    els.log.scrollTop = els.log.scrollHeight;
  }

  // ── 패널 ───────────────────────────────────────
  function openPanel() {
    hideBubble();
    open = true;
    ssSet(SS_OPEN, true);
    els.panel.style.display = 'flex';
    els.launcher.style.display = 'none';
    if (log.length === 0) {
      log.push({ role: 'assistant', content: greetingByEntry() });
      ssSet(SS_LOG, log);
    }
    render();
    setTimeout(function () { els.ta.focus(); }, 80);
  }
  function closePanel() {
    open = false;
    ssSet(SS_OPEN, false);
    els.panel.style.display = 'none';
    els.launcher.style.display = '';
  }

  // ── 전송 ───────────────────────────────────────
  function submit() {
    if (busy) return;
    var text = (els.ta.value || '').trim();
    if (!text) {
      els.ta.classList.remove('dain-shake');
      void els.ta.offsetWidth;
      els.ta.classList.add('dain-shake');
      els.ta.focus();
      return;
    }
    busy = true;
    els.send.disabled = true;
    els.ta.value = '';
    els.ta.style.height = 'auto';
    log.push({ role: 'user', content: text });
    ssSet(SS_LOG, log);
    render();
    showTyping(true);

    fetch(API, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        messages: log.map(function (m) { return { role: m.role, content: m.content }; }),
        page: document.title,
        officeOpen: officeOpen(),
      }),
    })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        showTyping(false);
        if (!d || !d.reply) throw new Error('empty');
        log.push({ role: 'assistant', content: d.reply, urgent: !!d.urgent });
        ssSet(SS_LOG, log);
        setExpression(d.expression);
        render();
        // 대화창에 번호를 적었다면 접수가 아니므로 폼을 열어 준다(연락처 유실 방지)
        if (d.phoneDetected && !leadDone) {
          var m = text.match(/01[016789][-.\s]?\d{3,4}[-.\s]?\d{4}/);
          setTimeout(function () { openForm(m ? m[0] : ''); }, 500);
        }
      })
      .catch(function () {
        showTyping(false);
        log.push({
          role: 'assistant',
          content: '지금 대화 연결이 원활하지 않네요. 급하시면 전화 ' + TEL + '로 연락 주시고, 아래 상담 예약하기로 연락처를 남겨 주시면 확인 즉시 연락드릴게요.',
        });
        ssSet(SS_LOG, log);
        render();
      })
      .then(function () {
        busy = false;
        els.send.disabled = false;
      });
  }

  // ── 인챗 접수 폼 ───────────────────────────────
  function openForm(prefillPhone) {
    if (!open) openPanel();
    if (els.panel.querySelector('.dain-form')) return;

    var f = document.createElement('div');
    f.className = 'dain-form';
    f.innerHTML =
      '<h4>상담 예약</h4>' +
      '<p class="dain-form__lead">성함과 연락처만 남겨 주시면 확인 후 연락드려요. 대화창에 적으신 번호는 전달되지 않아요. ' + '<a href="/privacy.html" target="_blank" rel="noopener" style="color:#1a2b4c;text-decoration:underline">개인정보처리방침</a></p>' +
      '<label>성함</label><input type="text" name="name" autocomplete="name" placeholder="홍길동">' +
      '<label>연락처</label><input type="tel" name="phone" autocomplete="tel" inputmode="numeric" placeholder="010-0000-0000">' +
      '<label class="dain-form__check">' +
        '<input type="checkbox" name="share">' +
        '<span>지금까지 나눈 대화를 함께 전달할게요. 체크하시면 변호사가 미리 읽고 연락드려서 처음부터 다시 설명하지 않으셔도 돼요. 체크하지 않으면 대화는 어디에도 전송되지 않아요.</span>' +
      '</label>' +
      '<div class="dain-form__row">' +
        '<button class="dain-form__cancel" type="button">취소</button>' +
        '<button class="dain-form__submit" type="button">예약 남기기</button>' +
      '</div>' +
      '<div class="dain-form__msg"></div>';
    els.panel.insertBefore(f, els.cta);

    var nameEl = f.querySelector('[name=name]');
    var phoneEl = f.querySelector('[name=phone]');
    var shareEl = f.querySelector('[name=share]');   // 민감정보라 기본 해제가 원칙
    var msgEl = f.querySelector('.dain-form__msg');
    if (prefillPhone) phoneEl.value = prefillPhone;

    f.querySelector('.dain-form__cancel').addEventListener('click', function () { f.remove(); });
    f.querySelector('.dain-form__submit').addEventListener('click', function () {
      var btn = this;
      var name = (nameEl.value || '').trim();
      var phone = (phoneEl.value || '').replace(/\D/g, '');
      msgEl.className = 'dain-form__msg';
      if (name.length < 2) { msgEl.className += ' dain-form__msg--err'; msgEl.textContent = '성함을 두 글자 이상 적어 주세요.'; nameEl.focus(); return; }
      if (!/^01[016789]\d{7,8}$/.test(phone)) { msgEl.className += ' dain-form__msg--err'; msgEl.textContent = '휴대전화 번호를 확인해 주세요.'; phoneEl.focus(); return; }

      var transcript = log
        .filter(function (m) { return m.content; })
        .map(function (m) { return (m.role === 'user' ? '손님: ' : '다인: ') + m.content; })
        .join(String.fromCharCode(10));
      // 예약 API는 상담내용 5자 이상을 요구한다 — 미동의여도 최소 문구를 채운다
      var content = shareEl.checked
        ? '다인 상담 챗봇을 통한 접수입니다. 대화 전문은 접수함에서 확인해 주세요.'
        : '다인 상담 챗봇을 통한 접수입니다. (손님이 대화 내용 전달에 동의하지 않았습니다.)';

      btn.disabled = true;
      btn.textContent = '전송 중…';
      fetch(RESERVE_API, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: name,
          phone: phone,
          area: 'etc',
          time: '',
          content: content,
          chatLog: shareEl.checked ? transcript : '',
          via: 'dain',
          attr: lsGet(LS_ATTR, null) || {},
        }),
      })
        .then(function (r) { return r.json().then(function (d) { return { ok: r.ok && d && d.ok, d: d }; }); })
        .then(function (res) {
          if (!res.ok) throw new Error('fail');
          leadDone = true;
          ssSet(SS_LEAD, true);
          f.remove();
          log.push({ role: 'assistant', content: name + '님, 접수됐어요. 확인하는 대로 ' + (officeOpen() ? '곧' : '다음 영업일 아침에 가장 먼저') + ' 연락드릴게요. 그 사이에도 궁금한 게 있으면 편하게 물어봐 주세요.' });
          ssSet(SS_LOG, log);
          setExpression('calm');
          render();
        })
        .catch(function () {
          btn.disabled = false;
          btn.textContent = '예약 남기기';
          msgEl.className = 'dain-form__msg dain-form__msg--err';
          msgEl.textContent = '전송이 되지 않았어요. 잠시 후 다시 시도해 주시거나 전화 ' + TEL + '로 연락 주세요.';
        });
    });

    setTimeout(function () { (prefillPhone ? nameEl : nameEl).focus(); }, 60);
  }

  // ── 시작 ───────────────────────────────────────
  function start() {
    build();
    setExpression('base');
    if (open) { openPanel(); }

    // 3.5초 뒤 첫 등장 — 현재 화면 안내가 있으면 그것부터
    setTimeout(function () {
      var hash = location.hash;
      var key = (hash && SECTION_INTRO[hash]) ? hash : location.pathname;
      if (introFor(key)) announce(key);
      else if (!open) showBubble(greetingByEntry());
    }, 3500);

    // 원페이지 홈 — 섹션 진입을 감지해 그 자리에서 말을 건다(경로가 안 바뀌므로 라우트 감지로는 잡히지 않는다)
    var ids = Object.keys(SECTION_INTRO).map(function (h) { return h.slice(1); });
    var targets = ids.map(function (id) { return document.getElementById(id); }).filter(Boolean);
    if (targets.length && 'IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) announce('#' + en.target.id);
        });
      }, { rootMargin: '-40% 0px -40% 0px', threshold: 0 });
      targets.forEach(function (t) { io.observe(t); });
    }

    // 해시 이동(메뉴 클릭)도 안내 대상
    window.addEventListener('hashchange', function () {
      if (location.hash) announce(location.hash);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
