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

// ===== Navigation Active Highlight on Scroll =====
const sections = document.querySelectorAll('section[id], footer[id]');
const navLinks = document.querySelectorAll('.nav-link');

function updateActiveNav() {
    const scrollPos = window.scrollY + 120;

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
}

window.addEventListener('scroll', updateActiveNav, { passive: true });
updateActiveNav();

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

// ===== Back to Top Button =====
const backToTop = document.getElementById('backToTop');

window.addEventListener('scroll', function () {
    if (window.scrollY > 600) {
        backToTop.classList.add('visible');
    } else {
        backToTop.classList.remove('visible');
    }
}, { passive: true });

backToTop.addEventListener('click', function () {
    window.scrollTo({ top: 0, behavior: 'smooth' });
});

// ===== EmailJS 초기화 =====
// TODO: EmailJS 가입 후 아래 값을 교체하세요
// 1. https://www.emailjs.com 가입 (무료 월 200건)
// 2. Email Services → 이메일 서비스 추가 (Gmail 등)
// 3. Email Templates → 템플릿 생성 (변수: from_name, phone, category, message)
// 4. Account → Public Key 복사
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
