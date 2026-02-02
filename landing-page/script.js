// ============================================
// Resource Capital Landing Page - JavaScript
// Enhanced Version with WOW Factor + Theme Support
// ============================================



// Theme Support - Syncs with platform settings via localStorage
const THEMES = ['midnight', 'emerald', 'bullion', 'prospector'];
const THEME_STORAGE_KEY = 'resource-capital-theme';

function initTheme() {
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);

    if (savedTheme && THEMES.includes(savedTheme)) {
        document.documentElement.setAttribute('data-theme', savedTheme);
    }
    // Default is midnight (no attribute needed since CSS defaults to it)
}

// Theme Toggle Button
function initThemeToggle() {
    const toggleBtn = document.getElementById('theme-toggle');
    if (!toggleBtn) return;

    toggleBtn.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'midnight';
        const currentIndex = THEMES.indexOf(currentTheme);
        const nextIndex = (currentIndex + 1) % THEMES.length;
        const nextTheme = THEMES[nextIndex];

        document.documentElement.setAttribute('data-theme', nextTheme);
        localStorage.setItem(THEME_STORAGE_KEY, nextTheme);

        // Visual feedback - pulse effect
        toggleBtn.style.transform = 'scale(1.2)';
        setTimeout(() => {
            toggleBtn.style.transform = '';
        }, 150);
    });
}

// Typing Animation
function initTypingAnimation() {
    const typingElement = document.getElementById('typing-text');
    if (!typingElement) return;

    const phrases = [
        'Institutional-grade analytics for mining investors.',
        'Real-time market data on 400+ TSX companies.',
        'Comprehensive project intelligence at your fingertips.',
        'Deep research tools for resource sector professionals.',
        'From discovery to production — track every stage.'
    ];

    let phraseIndex = 0;
    let charIndex = 0;
    let isDeleting = false;
    let typingSpeed = 50;

    function type() {
        const currentPhrase = phrases[phraseIndex];

        if (isDeleting) {
            typingElement.textContent = currentPhrase.substring(0, charIndex - 1);
            charIndex--;
            typingSpeed = 30;
        } else {
            typingElement.textContent = currentPhrase.substring(0, charIndex + 1);
            charIndex++;
            typingSpeed = 50;
        }

        if (!isDeleting && charIndex === currentPhrase.length) {
            // Pause at end of phrase
            isDeleting = true;
            typingSpeed = 2000;
        } else if (isDeleting && charIndex === 0) {
            isDeleting = false;
            phraseIndex = (phraseIndex + 1) % phrases.length;
            typingSpeed = 500;
        }

        setTimeout(type, typingSpeed);
    }

    // Start typing after initial delay
    setTimeout(type, 1000);
}

// Counter Animation
function initCounterAnimation() {
    const counters = document.querySelectorAll('[data-target]');

    const animateCounter = (counter) => {
        const target = +counter.getAttribute('data-target');
        const duration = 2000;
        const start = performance.now();

        function update(currentTime) {
            const elapsed = currentTime - start;
            const progress = Math.min(elapsed / duration, 1);

            // Easing function
            const easeOutQuart = 1 - Math.pow(1 - progress, 4);
            const current = Math.floor(easeOutQuart * target);

            counter.textContent = current.toLocaleString();

            if (progress < 1) {
                requestAnimationFrame(update);
            } else {
                counter.textContent = target.toLocaleString();
            }
        }

        requestAnimationFrame(update);
    };

    // Use Intersection Observer to trigger when visible
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                animateCounter(entry.target);
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.5 });

    counters.forEach(counter => observer.observe(counter));
}

// Scroll Reveal Animation
function initScrollReveal() {
    const revealElements = document.querySelectorAll('.reveal');
    const revealItems = document.querySelectorAll('.reveal-item');

    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');

                // If it's a container with items, reveal items with stagger
                const items = entry.target.querySelectorAll('.reveal-item');
                items.forEach((item, index) => {
                    setTimeout(() => {
                        item.classList.add('visible');
                    }, index * 100);
                });

                revealObserver.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    });

    revealElements.forEach(el => revealObserver.observe(el));

    // Also observe individual items that aren't in containers
    const itemObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && !entry.target.closest('.reveal')) {
                entry.target.classList.add('visible');
                itemObserver.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -30px 0px'
    });

    revealItems.forEach(el => {
        if (!el.closest('.reveal')) {
            itemObserver.observe(el);
        }
    });
}

// Waitlist Form Handler
function initWaitlistForm() {
    const form = document.querySelector('.waitlist-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const submitBtn = form.querySelector('.submit-btn');
        const emailInput = form.querySelector('.email-input');
        const originalBtnContent = submitBtn.innerHTML;

        // Loading state
        submitBtn.innerHTML = `
            <svg class="spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 20px; height: 20px; animation: spin 1s linear infinite;">
                <circle cx="12" cy="12" r="10" stroke-opacity="0.25"/>
                <path d="M12 2a10 10 0 0 1 10 10" stroke-linecap="round"/>
            </svg>
            <span>Joining...</span>
        `;
        submitBtn.disabled = true;

        try {
            const formData = new FormData(form);
            const response = await fetch(form.action, {
                method: 'POST',
                body: formData,
                headers: {
                    'Accept': 'application/json'
                }
            });

            if (response.ok) {
                showSuccess(form);
                // Update counter
                const counter = document.querySelector('.counter');
                if (counter) {
                    const current = parseInt(counter.textContent.replace(/,/g, '')) || 500;
                    counter.textContent = (current + 1).toLocaleString();
                }
            } else {
                throw new Error('Form submission failed');
            }
        } catch (error) {
            console.error('Error:', error);
            submitBtn.innerHTML = originalBtnContent;
            submitBtn.disabled = false;
            showError(form, 'Something went wrong. Please try again.');
        }
    });
}

function showSuccess(form) {
    const formContainer = form.querySelector('.form-container');
    const formNote = form.querySelector('.form-note');

    formContainer.style.display = 'none';
    formNote.style.display = 'none';

    const successHTML = `
        <div class="form-success show" style="display: flex; flex-direction: column; align-items: center; gap: 0.75rem; padding: 1.5rem; background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.2); border-radius: 16px; max-width: 480px; margin: 0 auto;">
            <svg viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2" style="width: 48px; height: 48px;">
                <circle cx="12" cy="12" r="10"/>
                <path d="M8 12l2.5 2.5L16 9" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <h3 style="font-size: 1.25rem; font-weight: 600;">You're on the list!</h3>
            <p style="color: #a0a0b0; font-size: 0.9375rem; text-align: center;">We'll notify you when Resource Capital launches. Stay tuned for early access.</p>
        </div>
    `;

    form.insertAdjacentHTML('beforeend', successHTML);
    createConfetti();
}

function showError(form, message) {
    const existingError = form.querySelector('.form-error');
    if (existingError) existingError.remove();

    const errorHTML = `
        <p class="form-error" style="color: #ef4444; font-size: 0.875rem; margin-top: 0.75rem; text-align: center;">${message}</p>
    `;

    form.querySelector('.form-container').insertAdjacentHTML('afterend', errorHTML);

    setTimeout(() => {
        const error = form.querySelector('.form-error');
        if (error) error.remove();
    }, 5000);
}

// Confetti effect
function createConfetti() {
    const colors = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ec4899'];
    const confettiCount = 60;

    for (let i = 0; i < confettiCount; i++) {
        const confetti = document.createElement('div');
        const size = Math.random() * 8 + 4;
        confetti.style.cssText = `
            position: fixed;
            width: ${size}px;
            height: ${size}px;
            background: ${colors[Math.floor(Math.random() * colors.length)]};
            left: ${Math.random() * 100}vw;
            top: -20px;
            border-radius: ${Math.random() > 0.5 ? '50%' : '2px'};
            pointer-events: none;
            z-index: 1000;
            animation: confetti-fall ${2.5 + Math.random() * 2}s ease-out forwards;
            animation-delay: ${Math.random() * 0.5}s;
            transform: rotate(${Math.random() * 360}deg);
        `;
        document.body.appendChild(confetti);
        setTimeout(() => confetti.remove(), 5000);
    }

    if (!document.querySelector('#confetti-style')) {
        const style = document.createElement('style');
        style.id = 'confetti-style';
        style.textContent = `
            @keyframes confetti-fall {
                0% { transform: translateY(0) rotate(0deg); opacity: 1; }
                100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
            }
            @keyframes spin {
                to { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(style);
    }
}

// Scroll-based navbar effect
function initScrollEffects() {
    const navbar = document.querySelector('.navbar');
    let lastScroll = 0;

    window.addEventListener('scroll', () => {
        const currentScroll = window.scrollY;

        if (currentScroll > 100) {
            navbar.style.background = 'rgba(10, 10, 15, 0.95)';
            navbar.style.borderBottom = '1px solid rgba(255, 255, 255, 0.05)';
        } else {
            navbar.style.background = 'linear-gradient(to bottom, rgba(10, 10, 15, 0.95) 0%, rgba(10, 10, 15, 0.8) 50%, transparent 100%)';
            navbar.style.borderBottom = 'none';
        }

        lastScroll = currentScroll;
    });
}

// Smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'center'
            });
        }
    });
});

// ============================================
// ADVANCED INTERACTIVE ANIMATIONS
// ============================================

// Interactive Particle Network
function initInteractiveParticles() {
    const container = document.getElementById('particles');
    if (!container) return;

    // Create canvas
    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none;';
    container.appendChild(canvas);

    const ctx = canvas.getContext('2d');
    let particles = [];
    let mouse = { x: null, y: null, radius: 150 };
    let animationId;

    // Resize canvas
    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        initParticles();
    }

    // Particle class
    class Particle {
        constructor() {
            this.x = Math.random() * canvas.width;
            this.y = Math.random() * canvas.height;
            this.baseX = this.x;
            this.baseY = this.y;
            this.size = Math.random() * 2 + 1;
            this.speedX = (Math.random() - 0.5) * 0.5;
            this.speedY = (Math.random() - 0.5) * 0.5;
            this.density = Math.random() * 30 + 1;
        }

        draw() {
            ctx.fillStyle = 'rgba(59, 130, 246, 0.6)';
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.closePath();
            ctx.fill();
        }

        update() {
            // Mouse interaction
            if (mouse.x !== null && mouse.y !== null) {
                const dx = mouse.x - this.x;
                const dy = mouse.y - this.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < mouse.radius) {
                    const force = (mouse.radius - distance) / mouse.radius;
                    const directionX = dx / distance;
                    const directionY = dy / distance;
                    this.x -= directionX * force * this.density * 0.5;
                    this.y -= directionY * force * this.density * 0.5;
                }
            }

            // Return to base position
            const dxBase = this.baseX - this.x;
            const dyBase = this.baseY - this.y;
            this.x += dxBase * 0.02;
            this.y += dyBase * 0.02;

            // Gentle drift
            this.baseX += this.speedX;
            this.baseY += this.speedY;

            // Bounce off edges
            if (this.baseX < 0 || this.baseX > canvas.width) this.speedX *= -1;
            if (this.baseY < 0 || this.baseY > canvas.height) this.speedY *= -1;

            this.draw();
        }
    }

    function initParticles() {
        particles = [];
        const particleCount = Math.min(80, Math.floor((canvas.width * canvas.height) / 15000));
        for (let i = 0; i < particleCount; i++) {
            particles.push(new Particle());
        }
    }

    function connectParticles() {
        for (let a = 0; a < particles.length; a++) {
            for (let b = a + 1; b < particles.length; b++) {
                const dx = particles[a].x - particles[b].x;
                const dy = particles[a].y - particles[b].y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < 120) {
                    const opacity = 1 - distance / 120;
                    ctx.strokeStyle = `rgba(59, 130, 246, ${opacity * 0.3})`;
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(particles[a].x, particles[a].y);
                    ctx.lineTo(particles[b].x, particles[b].y);
                    ctx.stroke();
                }
            }
        }
    }

    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        particles.forEach(particle => particle.update());
        connectParticles();
        animationId = requestAnimationFrame(animate);
    }

    // Event listeners
    window.addEventListener('resize', resizeCanvas);
    window.addEventListener('mousemove', (e) => {
        mouse.x = e.clientX;
        mouse.y = e.clientY;
    });
    window.addEventListener('mouseleave', () => {
        mouse.x = null;
        mouse.y = null;
    });

    // Initialize
    resizeCanvas();
    animate();
}

// Magnetic Button Effect
function initMagneticElements() {
    const magneticElements = document.querySelectorAll('.submit-btn, .cta-button, .nav-cta');

    magneticElements.forEach(el => {
        el.addEventListener('mousemove', (e) => {
            const rect = el.getBoundingClientRect();
            const x = e.clientX - rect.left - rect.width / 2;
            const y = e.clientY - rect.top - rect.height / 2;

            const strength = 0.3;
            el.style.transform = `translate(${x * strength}px, ${y * strength}px)`;
        });

        el.addEventListener('mouseleave', () => {
            el.style.transform = 'translate(0, 0)';
            el.style.transition = 'transform 0.3s ease-out';
        });

        el.addEventListener('mouseenter', () => {
            el.style.transition = 'transform 0.1s ease-out';
        });
    });
}

// Spotlight Effect on Feature Cards
function initSpotlightCards() {
    const cards = document.querySelectorAll('.feature-card');

    cards.forEach(card => {
        // Create spotlight overlay
        const spotlight = document.createElement('div');
        spotlight.className = 'spotlight-overlay';
        spotlight.style.cssText = `
            position: absolute;
            inset: 0;
            pointer-events: none;
            opacity: 0;
            transition: opacity 0.3s ease;
            border-radius: inherit;
            mix-blend-mode: overlay;
            background: radial-gradient(
                600px circle at var(--mouse-x, 50%) var(--mouse-y, 50%),
                rgba(34, 211, 238, 0.15),
                transparent 40%
            );
            z-index: 2;
        `;
        card.appendChild(spotlight);

        // Add a second glow layer for extra depth
        const glow = document.createElement('div');
        glow.className = 'spotlight-glow';
        glow.style.cssText = `
            position: absolute;
            inset: 0;
            pointer-events: none;
            opacity: 0;
            transition: opacity 0.3s ease;
            border-radius: inherit;
            background: radial-gradient(
                400px circle at var(--mouse-x, 50%) var(--mouse-y, 50%),
                rgba(34, 211, 238, 0.1),
                transparent 40%
            );
            z-index: 1;
        `;
        card.appendChild(glow);

        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width) * 100;
            const y = ((e.clientY - rect.top) / rect.height) * 100;

            const updatePos = (el) => {
                el.style.setProperty('--mouse-x', `${x}%`);
                el.style.setProperty('--mouse-y', `${y}%`);
                el.style.opacity = '1';
            };

            updatePos(spotlight);
            updatePos(glow);
        });

        card.addEventListener('mouseleave', () => {
            spotlight.style.opacity = '0';
            glow.style.opacity = '0';
        });
    });
}

// ============================================
// PREMIUM ANIMATIONS - Maximum Wow Factor
// ============================================

// Ripple Button Effect
function initRippleButtons() {
    const buttons = document.querySelectorAll('.submit-btn, .cta-button, .nav-cta');

    buttons.forEach(btn => {
        btn.addEventListener('click', function (e) {
            const rect = this.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            const ripple = document.createElement('span');
            ripple.className = 'ripple';
            ripple.style.left = `${x}px`;
            ripple.style.top = `${y}px`;
            ripple.style.width = ripple.style.height = `${Math.max(rect.width, rect.height)}px`;

            this.appendChild(ripple);
            setTimeout(() => ripple.remove(), 600);
        });
    });
}

// Staggered Text Reveal Animation
function initStaggeredTextReveal() {
    const heroTitle = document.querySelector('.hero-title');
    if (!heroTitle) return;

    // Store original HTML structure
    const originalHTML = heroTitle.innerHTML;

    // Parse the structure more carefully
    // Line 1: "Capital Intelligence for"
    // Line 2: <span class="gradient-text">Canada's Resource Sector</span>

    const line1 = "Capital Intelligence for";
    const line2Text = "Canada's Resource Sector";

    let wordIndex = 0;

    // Wrap line 1 words
    const line1Words = line1.split(' ').map(word => {
        wordIndex++;
        return `<span class="text-reveal-word" style="transition-delay: ${wordIndex * 0.1}s">${word}</span>`;
    }).join(' ');

    // Wrap line 2 words (inside gradient-text)
    const line2Words = line2Text.split(' ').map(word => {
        wordIndex++;
        return `<span class="text-reveal-word" style="transition-delay: ${wordIndex * 0.1}s">${word}</span>`;
    }).join(' ');

    // Reconstruct the HTML
    heroTitle.innerHTML = `${line1Words}<br><span class="gradient-text">${line2Words}</span>`;

    // Trigger reveal after a short delay
    setTimeout(() => {
        const words = heroTitle.querySelectorAll('.text-reveal-word');
        words.forEach(word => word.classList.add('visible'));
    }, 300);
}

// Parallax Section Reveal
function initParallaxSections() {
    const sections = document.querySelectorAll('.features-section, .stats-section, .final-cta');

    sections.forEach(section => {
        section.classList.add('parallax-reveal');
    });

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.15,
        rootMargin: '0px 0px -80px 0px'
    });

    sections.forEach(section => observer.observe(section));
}

// 3D Tilt Effect on Cards
function initTiltCards() {
    const cards = document.querySelectorAll('.feature-card');

    cards.forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;

            const rotateX = (y - centerY) / 20;
            const rotateY = (centerX - x) / 20;

            card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-8px)`;
        });

        card.addEventListener('mouseleave', () => {
            card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) translateY(0)';
        });
    });
}

// Enhanced Particles with Gradient Colors
function enhanceParticles() {
    // This is called from initInteractiveParticles to add gradient effect
    const colors = [
        'rgba(37, 99, 235, 0.7)',   // Blue
        'rgba(139, 92, 246, 0.6)',  // Purple
        'rgba(59, 130, 246, 0.8)',  // Light Blue
        'rgba(99, 102, 241, 0.5)'   // Indigo
    ];
    return colors[Math.floor(Math.random() * colors.length)];
}

// ============================================
// FINANCIAL TICKER LIVE DATA
// ============================================

async function updateTicker() {
    try {
        const response = await fetch('/api/ticker');
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();

        const items = document.querySelectorAll('.company-item');

        items.forEach(item => {
            // Find the text node containing the company name
            // The structure is: TextNode(Name) <span.t-price>... <span.t-change>...
            let nameNode = null;
            for (let i = 0; i < item.childNodes.length; i++) {
                if (item.childNodes[i].nodeType === 3 && item.childNodes[i].textContent.trim().length > 0) {
                    nameNode = item.childNodes[i];
                    break;
                }
            }

            if (!nameNode) return;

            const companyName = nameNode.textContent.trim();
            const marketData = data.find(d => d.name === companyName);

            if (marketData) {
                // Update Price
                const priceEl = item.querySelector('.t-price');
                if (priceEl) {
                    priceEl.textContent = `$${marketData.price.toFixed(2)}`;
                }

                // Update Change
                const changeEl = item.querySelector('.t-change');
                if (changeEl) {
                    const isUp = marketData.change >= 0;
                    const sign = isUp ? '▲' : '▼';
                    const colorClass = isUp ? 'up' : 'down';

                    changeEl.textContent = `${sign} ${Math.abs(marketData.changePercent).toFixed(2)}%`;
                    changeEl.className = `t-change ${colorClass}`;
                }
            }
        });
    } catch (error) {
        console.warn('Failed to fetch ticker data:', error);
    }
}

// Enhanced Initialization
document.addEventListener('DOMContentLoaded', () => {
    // Core Features
    initTheme();
    initThemeToggle();
    initTypingAnimation();
    initCounterAnimation();
    initScrollReveal();
    initWaitlistForm();

    // Visual Effects
    if (typeof initScrollEffects === 'function') initScrollEffects(); // Safety check
    initInteractiveParticles();
    if (typeof initMagneticElements === 'function') initMagneticElements(); // Safety check
    initSpotlightCards();
    initRippleButtons();
    initParallaxSections();
    initTiltCards();

    // Ticker Init
    updateTicker();
    // Refresh every 60s
    setInterval(updateTicker, 60000);
});
