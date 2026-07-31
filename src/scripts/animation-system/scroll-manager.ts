// src/scripts/animation-system/scroll-manager.ts
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

// ScrollTrigger 已在 gsap-animations.ts 中注册，避免重复注册

// ============ 统一滚动事件总线 (单次 RAF，避免多个 scroll listener 造成布局抖动) ============
type ScrollCallback = (scrollY: number, progress: number) => void;
const scrollCallbacks: ScrollCallback[] = [];
let scrollTicking = false;

function onGlobalScroll() {
    if (!scrollTicking) {
        scrollTicking = true;
        requestAnimationFrame(() => {
            const scrollY = window.scrollY;
            const docHeight = document.documentElement.scrollHeight - window.innerHeight;
            const progress = docHeight > 0 ? Math.min(scrollY / docHeight, 1) : 0;
            for (const cb of scrollCallbacks) {
                cb(scrollY, progress);
            }
            scrollTicking = false;
        });
    }
}

// 注册单个 scroll 监听，所有视差效果共享
window.addEventListener('scroll', onGlobalScroll, { passive: true });

/**
 * 注册滚动回调并返回取消注册函数
 */
export function registerScrollEffect(cb: ScrollCallback): () => void {
    scrollCallbacks.push(cb);
    return () => {
        const idx = scrollCallbacks.indexOf(cb);
        if (idx !== -1) scrollCallbacks.splice(idx, 1);
    };
}

// ============ 非线性滚动进度映射 ============

export function nonlinearProgress(linear: number, type: 'easeIn' | 'easeOut' | 'parallax' | 'wave' = 'easeOut'): number {
    const clamped = Math.max(0, Math.min(1, linear));

    switch (type) {
        case 'easeIn':
            return Math.pow(clamped, 3);
        case 'easeOut':
            return 1 - Math.pow(1 - clamped, 3);
        case 'parallax':
            return clamped * (2 - clamped);
        case 'wave':
            return clamped + Math.sin(clamped * Math.PI * 2) * 0.05 * (1 - clamped);
        default:
            return clamped;
    }
}

// ============ 初始化函数 ============

export function initParallaxScrolling(): void {
    const layers = gsap.utils.toArray<HTMLElement>('.parallax-layer .scroll-item');
    const visuals = gsap.utils.toArray<HTMLElement>('.scroll-visual');

    // 使用 GSAP ScrollTrigger 的 scrub，其已在内部做 RAF 优化
    layers.forEach((item, index) => {
        const direction = index % 2 === 0 ? 1 : -1;
        gsap.fromTo(item, { y: 100 * direction, opacity: 0 }, {
            y: -100 * direction, opacity: 1, ease: 'none',
            scrollTrigger: { trigger: '#cosmic-journey', start: 'top bottom', end: 'bottom top', scrub: 0.8 },
        });
    });

    visuals.forEach((visual, index) => {
        const scaleStart = 0.5 + index * 0.2;
        gsap.fromTo(visual, { scale: scaleStart, rotate: -15 * (index + 1) }, {
            scale: 1.2, rotate: 15 * (index + 1), ease: 'power1.inOut',
            scrollTrigger: { trigger: '#cosmic-journey', start: 'top 80%', end: 'bottom 20%', scrub: 0.6 },
        });
    });
}

export function initStaggerReveal(): void {
    ScrollTrigger.batch('.scroll-item', {
        onEnter: (batch) => {
            gsap.fromTo(batch, { y: 80, opacity: 0, scale: 0.9 }, {
                y: 0, opacity: 1, scale: 1, duration: 1,
                stagger: (index: number) => Math.pow(index + 1, 1.5) * 0.08,
                ease: 'elastic.out(0.7, 0.3)',
            });
        },
        start: 'top 85%',
    });
}

export function initScrollIndicator(): void {
    const indicator = document.getElementById('scroll-indicator');
    if (!indicator) return;
    gsap.to(indicator, {
        opacity: 0, y: -20,
        scrollTrigger: { trigger: '#hero', start: 'top top', end: 'bottom top', scrub: 0.5 },
    });
}

export function initScrollProgressEffects(): void {
    gsap.to('body', {
        scrollTrigger: {
            trigger: 'body', start: 'top top', end: 'bottom bottom', scrub: 0.3,
            onUpdate: (self) => {
                document.documentElement.style.setProperty('--scroll-progress', nonlinearProgress(self.progress, 'easeOut').toString());
            },
        },
    });
}

/**
 * 滚动进度条（合并到统一 RAF）
 */
export function initScrollProgressBar(): void {
    const progressBar = document.createElement('div');
    progressBar.id = 'scroll-progress-bar';
    document.body.appendChild(progressBar);

    registerScrollEffect((_, progress) => {
        progressBar.style.width = `${progress * 100}%`;
        progressBar.style.opacity = progress > 0.01 ? '1' : '0';
    });
}

/**
 * WebGL 背景视差（合并到统一 RAF）
 */
export function initWebGLScrollParallax(): void {
    const container = document.getElementById('webgl-container');
    if (!container) return;
    registerScrollEffect((scrollY) => {
        container.style.transform = `translateY(${scrollY * 0.15}px)`;
    });
}

/**
 * 星云光晕偏移（合并到统一 RAF）
 */
export function initNebulaScrollShift(): void {
    // 通过 id 定位，避免依赖具体 class 组合（class 变更会静默失效）
    const nebulaOverlay = document.getElementById('nebula-overlay') as HTMLElement | null;
    if (!nebulaOverlay) return;
    registerScrollEffect((scrollY) => {
        const shiftX = Math.sin(scrollY * 0.0005) * 20;
        nebulaOverlay.style.transform = `translate(${shiftX}px, ${scrollY * 0.08}px)`;
    });
}

/**
 * Hero 区域滚动视差（合并到统一 RAF）
 */
export function initHeroScrollParallax(): void {
    const heroTitle = document.getElementById('hero-title');
    const heroSubtitle = document.getElementById('hero-subtitle');
    const heroBadge = document.getElementById('hero-badge');
    const heroCta = document.getElementById('hero-cta');
    const scrollIndicator = document.getElementById('scroll-indicator');

    registerScrollEffect((scrollY) => {
        const heroHeight = window.innerHeight;
        const progress = Math.min(scrollY / heroHeight, 1);

        if (heroTitle) {
            heroTitle.style.transform = `translateY(${progress * -60}px) scale(${1 - progress * 0.15})`;
            heroTitle.style.opacity = `${1 - progress * 1.2}`;
        }
        if (heroSubtitle) {
            heroSubtitle.style.transform = `translateY(${progress * -40}px)`;
            heroSubtitle.style.opacity = `${1 - progress * 1.5}`;
        }
        if (heroBadge) {
            heroBadge.style.transform = `translateY(${progress * -20}px)`;
            heroBadge.style.opacity = `${1 - progress * 1.8}`;
        }
        if (heroCta) {
            heroCta.style.transform = `translateY(${progress * -30}px)`;
            heroCta.style.opacity = `${1 - progress * 1.4}`;
        }
        if (scrollIndicator) {
            scrollIndicator.style.opacity = `${1 - progress * 2}`;
        }
    });
}

/**
 * 初始化所有滚动相关动画
 */
export function initAllScrollAnimations(): void {
    initParallaxScrolling();
    initStaggerReveal();
    initScrollIndicator();
    initScrollProgressEffects();
    initScrollProgressBar();
    initWebGLScrollParallax();
    initNebulaScrollShift();
    initHeroScrollParallax();

    // 刷新 ScrollTrigger
    ScrollTrigger.refresh();
}
