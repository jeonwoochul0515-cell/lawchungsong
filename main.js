// ===== Page Loader =====
window.addEventListener('load', function () {
    const loader = document.getElementById('pageLoader');
    setTimeout(() => {
        loader.classList.add('fade-out');
        setTimeout(() => loader.remove(), 500);
    }, 800);
});

// ===== Service Worker Registration =====
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch(() => {});
    });
}

// ===== Mobile Menu Toggle =====
function toggleMobileMenu() {
    const menu = document.getElementById('mobileMenu');
    const btn = document.getElementById('mobileMenuBtn');
    const isOpen = menu.classList.contains('open');

    if (isOpen) {
        const drawer = document.getElementById('mobileMenuDrawer');
        drawer.style.transform = 'translateX(100%)';
        setTimeout(() => {
            menu.classList.remove('open');
            btn.classList.remove('menu-open');
            document.body.style.overflow = 'auto';
        }, 300);
    } else {
        menu.classList.add('open');
        btn.classList.add('menu-open');
        document.body.style.overflow = 'hidden';
        requestAnimationFrame(() => {
            document.getElementById('mobileMenuDrawer').style.transform = 'translateX(0)';
        });
    }
}

document.getElementById('mobileMenuBtn').addEventListener('click', toggleMobileMenu);

// ===== Scroll Reveal (Intersection Observer) =====
const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
            revealObserver.unobserve(entry.target);
        }
    });
}, { threshold: 0.1 });

document.querySelectorAll('.scroll-reveal').forEach(el => revealObserver.observe(el));

// ===== Unified Scroll Handler =====
const sections = document.querySelectorAll('section[id], footer[id]');
const navLinks = document.querySelectorAll('.nav-link');
const backToTop = document.getElementById('backToTop');
const scrollProgress = document.getElementById('scrollProgress');
const nav = document.querySelector('nav');

function onScroll() {
    const scrollY = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;

    // Scroll progress bar
    if (scrollProgress && docHeight > 0) {
        scrollProgress.style.width = (scrollY / docHeight * 100) + '%';
    }

    // Nav glassmorphism on scroll
    if (nav) {
        if (scrollY > 80) {
            nav.classList.add('scrolled');
        } else {
            nav.classList.remove('scrolled');
        }
    }

    // Active nav highlight
    const scrollPos = scrollY + 120;
    let currentId = '';
    sections.forEach(section => {
        if (section.offsetTop <= scrollPos) {
            currentId = section.id;
        }
    });

    navLinks.forEach(link => {
        link.classList.remove('active');
        const href = link.getAttribute('href');
        if (href === '#' + currentId) {
            link.classList.add('active');
        }
    });

    // Back to top visibility
    if (backToTop) {
        if (scrollY > 600) {
            backToTop.classList.add('visible');
        } else {
            backToTop.classList.remove('visible');
        }
    }
}

window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

if (backToTop) {
    backToTop.addEventListener('click', function () {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}

// ===== Statistics Counter Animation =====
const counterObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const counters = entry.target.querySelectorAll('.stat-number');
            counters.forEach(counter => {
                const target = parseInt(counter.getAttribute('data-count'), 10);
                const suffix = counter.getAttribute('data-suffix') || '';
                const duration = 2000;
                const start = performance.now();

                function animate(now) {
                    const elapsed = now - start;
                    const progress = Math.min(elapsed / duration, 1);
                    // Ease out cubic
                    const eased = 1 - Math.pow(1 - progress, 3);
                    const current = Math.round(eased * target);
                    counter.textContent = current.toLocaleString() + suffix;

                    if (progress < 1) {
                        requestAnimationFrame(animate);
                    }
                }

                requestAnimationFrame(animate);
            });
            counterObserver.unobserve(entry.target);
        }
    });
}, { threshold: 0.3 });

document.querySelectorAll('.stats-section').forEach(el => counterObserver.observe(el));

// ===== FAQ Accordion =====
function toggleFaq(button) {
    const item = button.parentElement;
    const answer = item.querySelector('.faq-answer');
    const isOpen = item.classList.contains('open');

    // Close all others
    document.querySelectorAll('.faq-item.open').forEach(openItem => {
        openItem.classList.remove('open');
        openItem.querySelector('.faq-answer').style.maxHeight = '0';
    });

    // Toggle clicked
    if (!isOpen) {
        item.classList.add('open');
        answer.style.maxHeight = answer.scrollHeight + 'px';
    }
}

// ===== Floating CTA Dynamic Tooltip =====
(function() {
    const tooltip = document.getElementById('floatingTooltip');
    if (!tooltip) return;

    const messages = [
        { min: 0, max: 25, text: '궁금한 점 있으시면 편하게 연락주세요' },
        { min: 25, max: 50, text: '궁금한 점 있으시면 편하게 연락주세요' },
        { min: 50, max: 75, text: '지금 전화하시면 오늘 상담 가능합니다' },
        { min: 75, max: 100, text: '지금 바로 상담을 예약해보세요' }
    ];

    let currentMsg = '';
    let tooltipTimer = null;
    let hideTimer = null;

    function updateTooltip() {
        const scrollY = window.scrollY;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        const scrollPct = docHeight > 0 ? (scrollY / docHeight) * 100 : 0;

        const match = messages.find(m => scrollPct >= m.min && scrollPct < m.max) || messages[messages.length - 1];

        if (match.text !== currentMsg && scrollPct > 20) {
            currentMsg = match.text;
            tooltip.textContent = currentMsg;
            tooltip.classList.remove('hidden');
            tooltip.classList.add('show');

            clearTimeout(hideTimer);
            hideTimer = setTimeout(function() {
                tooltip.classList.remove('show');
            }, 4000);
        }
    }

    // Show tooltip periodically based on scroll
    let scrollTimeout;
    window.addEventListener('scroll', function() {
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(updateTooltip, 500);
    }, { passive: true });

    // Initial show after 5 seconds
    setTimeout(function() {
        const scrollY = window.scrollY;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        const scrollPct = docHeight > 0 ? (scrollY / docHeight) * 100 : 0;
        if (scrollPct < 25) {
            tooltip.textContent = messages[0].text;
            tooltip.classList.remove('hidden');
            tooltip.classList.add('show');
            hideTimer = setTimeout(function() {
                tooltip.classList.remove('show');
            }, 4000);
        }
    }, 5000);
})();

// ===== Cookie Consent Banner =====
function acceptCookies() {
    localStorage.setItem('cookieConsent', 'accepted');
    const banner = document.getElementById('cookieBanner');
    banner.style.opacity = '0';
    banner.style.transform = 'translateY(20px)';
    setTimeout(() => banner.classList.add('hidden'), 300);
}

(function showCookieBanner() {
    if (!localStorage.getItem('cookieConsent')) {
        const banner = document.getElementById('cookieBanner');
        setTimeout(() => {
            banner.classList.remove('hidden');
            banner.style.transition = 'opacity 0.3s, transform 0.3s';
            banner.style.opacity = '1';
        }, 1500);
    }
})();

// ===== GA4 전환 이벤트 (전화·카카오톡·네이버 예약 클릭) =====
// 사이트 어디서든 해당 링크 클릭 시 GA4 이벤트 전송 (위임 방식)
document.addEventListener('click', function (e) {
    const link = e.target.closest('a');
    if (!link || typeof gtag !== 'function') return;

    const href = link.getAttribute('href') || '';
    let method = '';
    if (href.startsWith('tel:')) method = 'phone';
    else if (href.includes('pf.kakao.com')) method = 'kakao';
    else if (href.includes('/booking')) method = 'naver_booking';

    if (method) {
        gtag('event', 'contact_click', { method: method });
    }
});

// ===== 이벤트 위임 디스패처 (inline onclick 대체) =====
// data-action 속성으로 동작을 선언 → 마크업에서 JS 호출 분리
// openModal/closeModal은 index.html 인라인 스크립트의 전역 함수
document.addEventListener('click', function (e) {
    const el = e.target.closest('[data-action]');
    if (!el) return;

    switch (el.dataset.action) {
        case 'scroll-top':     window.scrollTo(0, 0); break;
        case 'toggle-menu':    toggleMobileMenu(); break;
        case 'open-modal':     openModal(el.dataset.modal); break;
        case 'close-modal':    closeModal(); break;
        case 'toggle-faq':     toggleFaq(el); break;
        case 'accept-cookies': acceptCookies(); break;
    }
});

// ===== 최신 블로그 글 (네이버 RSS → /api/blog 서버리스 함수) =====
(function loadBlogPosts() {
    const wrap = document.getElementById('blogPosts');
    if (!wrap) return;

    const esc = (s) => String(s).replace(/[&<>"']/g, (c) =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

    const fallback = () => {
        wrap.innerHTML = '<div class="col-span-full text-center py-6">' +
            '<a href="https://blog.naver.com/lawchungsong" target="_blank" rel="noopener" ' +
            'class="text-navy font-semibold hover:underline">네이버 블로그에서 최신 글 보기 →</a></div>';
    };

    fetch('/api/blog')
        .then((r) => r.json())
        .then((data) => {
            const items = (data && data.items) || [];
            if (!items.length) { fallback(); return; }
            wrap.innerHTML = items.map((p) => {
                const d = new Date(p.pubDate);
                const date = isNaN(d.getTime()) ? '' :
                    d.getFullYear() + '.' + String(d.getMonth() + 1).padStart(2, '0') + '.' + String(d.getDate()).padStart(2, '0');
                return '<a href="' + encodeURI(p.link) + '" target="_blank" rel="noopener" ' +
                    'class="block bg-gray-50 rounded-2xl border border-gray-100 p-6 hover:-translate-y-1 hover:shadow-md transition-all duration-300">' +
                    '<div class="flex items-center gap-2 text-gold text-xs font-bold mb-3"><i class="fa-solid fa-blog"></i><span>네이버 블로그</span></div>' +
                    '<h3 class="font-bold text-gray-900 leading-snug mb-3 line-clamp-2">' + esc(p.title) + '</h3>' +
                    '<p class="text-gray-400 text-sm">' + date + '</p></a>';
            }).join('');
        })
        .catch(fallback);
})();

// ===== 법률 칼럼 (자체 콘텐츠 columns/index.json) =====
(function loadColumns() {
    const wrap = document.getElementById('columnList');
    if (!wrap) return;

    const esc = (s) => String(s).replace(/[&<>"']/g, (c) =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

    fetch('columns/index.json')
        .then((r) => r.json())
        .then((list) => {
            const items = (Array.isArray(list) ? list : []).slice(0, 6);
            if (!items.length) {
                wrap.innerHTML = '<div class="col-span-full text-center text-gray-400 py-6">준비 중입니다.</div>';
                return;
            }
            wrap.innerHTML = items.map((c) =>
                '<a href="columns/' + encodeURIComponent(c.slug) + '.html" ' +
                'class="block bg-gray-50 rounded-2xl border border-gray-100 p-6 hover:-translate-y-1 hover:shadow-md transition-all duration-300 text-left">' +
                '<span class="inline-block text-gold text-xs font-bold mb-3">' + esc(c.category || '법률 칼럼') + '</span>' +
                '<h3 class="font-bold text-gray-900 leading-snug mb-2 line-clamp-2">' + esc(c.title) + '</h3>' +
                '<p class="text-gray-500 text-sm leading-relaxed mb-3 line-clamp-2">' + esc(c.summary || '') + '</p>' +
                '<p class="text-gray-400 text-xs">' + esc(c.date || '') + '</p></a>'
            ).join('');
        })
        .catch(() => {
            wrap.innerHTML = '<div class="col-span-full text-center text-gray-400 py-6">준비 중입니다.</div>';
        });
})();

// ===== 쉽게 읽는 대법원 판례 (precedents/index.json) =====
(function loadPrecedents() {
    const wrap = document.getElementById('precedentList');
    if (!wrap) return;

    const esc = (s) => String(s).replace(/[&<>"']/g, (c) =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

    fetch('precedents/index.json')
        .then((r) => r.json())
        .then((list) => {
            const items = (Array.isArray(list) ? list : []).slice(0, 6);
            if (!items.length) {
                wrap.innerHTML = '<div class="col-span-full text-center text-gray-400 py-6">판례 해설을 준비하고 있습니다.</div>';
                return;
            }
            wrap.innerHTML = items.map((c) =>
                '<a href="precedents/' + encodeURIComponent(c.slug) + '.html" ' +
                'class="block bg-white rounded-2xl border border-gray-100 p-6 hover:-translate-y-1 hover:shadow-md transition-all duration-300 text-left">' +
                '<span class="inline-block text-gold text-xs font-bold mb-3">' + esc(c.category || '대법원 판례') + '</span>' +
                '<h3 class="font-bold text-gray-900 leading-snug mb-2 line-clamp-2">' + esc(c.title) + '</h3>' +
                '<p class="text-gray-500 text-sm leading-relaxed mb-3 line-clamp-2">' + esc(c.summary || '') + '</p>' +
                '<p class="text-gray-400 text-xs">' + esc(c.date || '') + '</p></a>'
            ).join('');
        })
        .catch(() => {
            wrap.innerHTML = '<div class="col-span-full text-center text-gray-400 py-6">판례 해설을 준비하고 있습니다.</div>';
        });
})();

// ===== PWA 설치 유도 (푸터 '홈 화면에 설치' 버튼 + 1회성 배너) =====
(function () {
    const installBtn = document.getElementById('installBtn');
    const banner = document.getElementById('installBanner');
    const isStandalone = (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true;
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    let deferredPrompt = null;

    // 이미 설치(앱 모드)했거나 설치 완료 기록이 있으면 아무것도 안 함
    if (isStandalone || localStorage.getItem('pwaInstalled')) return;

    function showBtn() { if (installBtn) installBtn.classList.remove('hidden'); }

    function maybeShowBanner() {
        if (!banner) return;
        if (localStorage.getItem('installPromptSeen')) return; // 한 번만
        if (window.innerWidth > 768) return;                   // 모바일에서만
        if (!localStorage.getItem('cookieConsent')) return;    // 쿠키 배너와 겹치지 않게
        setTimeout(function () { banner.classList.remove('hidden'); }, 3000);
    }

    function doInstall() {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            deferredPrompt.userChoice.then(function () {
                deferredPrompt = null;
                if (banner) banner.classList.add('hidden');
            });
        } else if (isIOS) {
            alert('아이폰에서는 사파리 하단의 공유 버튼을 누른 뒤 "홈 화면에 추가"를 선택하시면 됩니다.');
        }
    }

    function dismissBanner() {
        if (!banner) return;
        const text = document.getElementById('installBannerText');
        if (text) text.textContent = '괜찮습니다. 설치하지 않아도 모든 기능을 그대로 이용하실 수 있어요. 도움이 필요하시면 1660-4452로 편하게 연락 주세요.';
        banner.querySelectorAll('.install-banner-btn').forEach(function (b) { b.classList.add('hidden'); });
        localStorage.setItem('installPromptSeen', '1');
        setTimeout(function () { banner.classList.add('hidden'); }, 3500);
    }

    window.addEventListener('beforeinstallprompt', function (e) {
        e.preventDefault();
        deferredPrompt = e;
        showBtn();
        maybeShowBanner();
    });

    window.addEventListener('appinstalled', function () {
        deferredPrompt = null;
        localStorage.setItem('pwaInstalled', '1');
        if (installBtn) installBtn.classList.add('hidden');
        if (banner) banner.classList.add('hidden');
    });

    // iOS는 beforeinstallprompt가 없으므로 버튼을 직접 노출(클릭 시 안내)
    if (isIOS) showBtn();

    document.addEventListener('click', function (e) {
        const el = e.target.closest('[data-action]');
        if (!el) return;
        if (el.dataset.action === 'pwa-install') doInstall();
        else if (el.dataset.action === 'pwa-dismiss') dismissBanner();
    });
})();
