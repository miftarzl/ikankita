// ===== Landing Page JS =====

// Navbar scroll effect
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }
});

// Particles
function createParticles() {
    const container = document.getElementById('particles');
    if (!container) return;
    const colors = ['#14b8a6', '#06b6d4', '#0891b2', '#10b981', '#818cf8'];
    for (let i = 0; i < 40; i++) {
        const particle = document.createElement('div');
        particle.classList.add('particle');
        const size = Math.random() * 4 + 2;
        particle.style.cssText = `
            width: ${size}px;
            height: ${size}px;
            left: ${Math.random() * 100}%;
            background: ${colors[Math.floor(Math.random() * colors.length)]};
            animation-duration: ${Math.random() * 15 + 10}s;
            animation-delay: ${Math.random() * 10}s;
        `;
        container.appendChild(particle);
    }
}
createParticles();

// Animated counters
function animateCount(el, target, duration = 1800) {
    const start = performance.now();
    const isDecimal = String(target).includes('.');
    function update(ts) {
        const elapsed = ts - start;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        const value = eased * target;
        el.textContent = isDecimal ? value.toFixed(1) : Math.round(value).toLocaleString('id-ID');
        if (progress < 1) requestAnimationFrame(update);
    }
    requestAnimationFrame(update);
}

// IntersectionObserver for stat counters
const statObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const el = entry.target;
            const target = parseFloat(el.dataset.target);
            animateCount(el, target);
            statObserver.unobserve(el);
        }
    });
}, { threshold: 0.5 });

document.querySelectorAll('.stat-number').forEach(el => statObserver.observe(el));

// Metric bars animation
const metricObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.querySelectorAll('.metric-fill').forEach(fill => {
                const targetWidth = fill.dataset.width;
                setTimeout(() => { fill.style.width = targetWidth + '%'; }, 100);
            });
            metricObserver.unobserve(entry.target);
        }
    });
}, { threshold: 0.3 });

const metricsSection = document.querySelector('.metrics-list');
if (metricsSection) metricObserver.observe(metricsSection);

// Ring animation
const ringObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const ring = document.getElementById('mainRing');
            const numEl = document.getElementById('ringNumber');
            if (!ring || !numEl) return;

            const target = 96.17;
            const circumference = 314;
            const offset = circumference - (target / 100 * circumference);

            setTimeout(() => {
                ring.style.transition = 'stroke-dashoffset 2s cubic-bezier(0.4,0,0.2,1)';
                ring.style.strokeDashoffset = offset;
            }, 200);

            // Animate number
            let start = 0;
            const startTime = performance.now();
            function animateRing(ts) {
                const progress = Math.min((ts - startTime) / 2000, 1);
                const eased = 1 - Math.pow(1 - progress, 3);
                numEl.textContent = (eased * target).toFixed(1);
                if (progress < 1) requestAnimationFrame(animateRing);
            }
            requestAnimationFrame(animateRing);
            ringObserver.unobserve(entry.target);
        }
    });
}, { threshold: 0.4 });

const accSection = document.querySelector('.accuracy-card');
if (accSection) ringObserver.observe(accSection);

// Smooth scroll
document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', (e) => {
        const target = document.querySelector(link.getAttribute('href'));
        if (target) {
            e.preventDefault();
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    });
});

// Hamburger menu
const hamburger = document.getElementById('hamburger');
if (hamburger) {
    hamburger.addEventListener('click', () => {
        const navLinks = document.querySelector('.nav-links');
        if (navLinks) navLinks.classList.toggle('mobile-open');
    });
}

// Fade-in on scroll
const fadeObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            // Stagger children if possible
            const delay = Array.from(entry.target.parentElement?.children || []).indexOf(entry.target) * 80;
            setTimeout(() => {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }, delay);
            fadeObserver.unobserve(entry.target);
        }
    });
}, { threshold: 0, rootMargin: '0px 0px -40px 0px' });

document.querySelectorAll('.feature-card, .step-card, .accuracy-card').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(24px)';
    el.style.transition = 'opacity 0.55s ease, transform 0.55s ease';
    fadeObserver.observe(el);
});
