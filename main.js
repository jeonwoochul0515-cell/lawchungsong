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

// ===== EmailJS =====
// TODO: EmailJS 가입 후 아래 값을 교체하세요
// 1. https://www.emailjs.com 가입 (무료 월 200건)
// 2. Email Services -> 이메일 서비스 추가 (Gmail 등)
// 3. Email Templates -> 템플릿 생성 (변수: from_name, phone, category, message)
// 4. Account -> Public Key 복사
const EMAILJS_PUBLIC_KEY = 'YOUR_PUBLIC_KEY';     // 교체 필요
const EMAILJS_SERVICE_ID = 'YOUR_SERVICE_ID';     // 교체 필요
const EMAILJS_TEMPLATE_ID = 'YOUR_TEMPLATE_ID';   // 교체 필요

if (typeof emailjs !== 'undefined' && EMAILJS_PUBLIC_KEY !== 'YOUR_PUBLIC_KEY') {
    emailjs.init(EMAILJS_PUBLIC_KEY);
}

// ===== Contact Form =====
const contactForm = document.getElementById('contactForm');
if (contactForm) {
    contactForm.addEventListener('submit', function (e) {
        e.preventDefault();

        const formData = new FormData(contactForm);
        const name = formData.get('name');
        const phone = formData.get('phone');
        const category = formData.get('category') || '미선택';
        const message = formData.get('message');

        // 클립보드에 문의 내용 복사 (카카오톡 붙여넣기용)
        const clipboardText =
            '[홈페이지 문의]\n' +
            '이름: ' + name + '\n' +
            '연락처: ' + phone + '\n' +
            '분야: ' + category + '\n' +
            '문의 내용: ' + message;

        navigator.clipboard.writeText(clipboardText).catch(() => {});

        // EmailJS로 이메일 전송
        if (typeof emailjs !== 'undefined' && EMAILJS_PUBLIC_KEY !== 'YOUR_PUBLIC_KEY') {
            emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
                from_name: name,
                phone: phone,
                category: category,
                message: message
            }).catch(() => {});
        }

        // 성공 화면 표시
        contactForm.classList.add('hidden');
        document.getElementById('contactSuccess').classList.remove('hidden');
    });
}

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
