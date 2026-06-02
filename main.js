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
