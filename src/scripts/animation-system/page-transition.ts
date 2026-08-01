// src/scripts/animation-system/page-transition.ts
import gsap from 'gsap';

/**
 * 宇宙跃迁页面过渡动画
 * 点击 NASA 按钮时触发虫洞穿越效果，然后导航到目标页面
 */

/** 允许的目标 URL 白名单 */
const ALLOWED_TARGETS = ['/nasa.html', '/journey.html', '/index.html', '/'];

interface TransitionOptions {
    /** 过渡持续时间 (ms) */
    duration?: number;
    /** 目标 URL */
    targetUrl?: string;
}

/**
 * 创建过渡覆盖层 DOM 元素
 */
function createTransitionOverlay(): HTMLElement {
    if (document.getElementById('cosmic-transition')) {
        return document.getElementById('cosmic-transition')!;
    }

    const overlay = document.createElement('div');
    overlay.id = 'cosmic-transition';
    overlay.innerHTML = `
        <div class="transition-warp-ring"></div>
        <div class="transition-particle-field"></div>
        <div class="transition-core"></div>
        <div class="transition-spark-trail"></div>
    `;
    document.body.appendChild(overlay);
    return overlay;
}

/**
 * 创建粒子场（小型星光粒子）
 * 每次调用前清空旧粒子，避免 DOM 无限累积
 */
function spawnParticles(container: HTMLElement): void {
    const particleField = container.querySelector('.transition-particle-field')!;
    particleField.innerHTML = ''; // 清空上一次过渡残留的粒子
    const count = 40;

    for (let i = 0; i < count; i++) {
        const particle = document.createElement('div');
        particle.className = 'transition-particle';
        const angle = Math.random() * Math.PI * 2;
        const distance = 60 + Math.random() * 200;
        const size = 1 + Math.random() * 3;
        const tx = Math.cos(angle) * distance;
        const ty = Math.sin(angle) * distance;
        particle.style.cssText = `
            --tx: ${tx}px;
            --ty: ${ty}px;
            --size: ${size}px;
            --delay: ${Math.random() * 0.4}s;
            --duration: ${0.6 + Math.random() * 0.8}s;
        `;
        particleField.appendChild(particle);
    }
}

// 并发守卫：过渡进行中时忽略重复触发
let isTransitioning = false;

/**
 * 执行宇宙跃迁过渡动画
 * @param sourceElement 点击的源元素（用于计算动画起点）
 * @param options 过渡选项
 */
export function executeCosmicTransition(
    sourceElement: HTMLElement,
    options: TransitionOptions = {}
): void {
    if (isTransitioning) return;
    isTransitioning = true;

    const {
        duration = 1200,
        targetUrl = '/nasa.html',
    } = options;

    const overlay = createTransitionOverlay();
    const warpRing = overlay.querySelector('.transition-warp-ring') as HTMLElement;
    const core = overlay.querySelector('.transition-core') as HTMLElement;
    const sparkTrail = overlay.querySelector('.transition-spark-trail') as HTMLElement;

    // 获取源元素中心位置
    const rect = sourceElement.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    // 生成粒子
    spawnParticles(overlay);

    // 设置覆盖层初始状态
    gsap.set(overlay, {
        opacity: 0,
        display: 'flex',
        '--origin-x': `${centerX}px`,
        '--origin-y': `${centerY}px`,
    });

    gsap.set(warpRing, {
        scale: 0,
        x: centerX - window.innerWidth / 2,
        y: centerY - window.innerHeight / 2,
        opacity: 0,
    });

    gsap.set(core, {
        scale: 0,
        opacity: 0,
    });

    // 时间线编排
    const safeUrl = ALLOWED_TARGETS.includes(targetUrl) ? targetUrl : '/';
    let navigated = false;
    let fallbackTimer: ReturnType<typeof setTimeout> | null = null;

    const doNavigate = () => {
        if (navigated) return;
        navigated = true;
        // 兜底 timer 已触发则无需清理；若 GSAP onComplete 先触发，则取消兜底
        if (fallbackTimer !== null) {
            clearTimeout(fallbackTimer);
            fallbackTimer = null;
        }
        window.location.href = safeUrl;
    };

    const tl = gsap.timeline({
        onComplete: doNavigate,
    });

    // 安全兜底：即使 GSAP 回调失败，也确保在 duration+500ms 后导航
    fallbackTimer = setTimeout(doNavigate, duration + 500);

    // 阶段1：虫洞入口 — 暗色覆盖层从按钮位置扩散
    tl.to(overlay, {
        opacity: 1,
        duration: 0.25,
        ease: 'power2.in',
    });

    // 阶段2：虫洞环从按钮处爆发式扩大
    tl.to(warpRing, {
        scale: 1,
        opacity: 0.9,
        duration: 0.5,
        ease: 'power3.in',
    }, '-=0.1');

    // 核心光芒出现
    tl.to(core, {
        scale: 1,
        opacity: 0.8,
        duration: 0.35,
        ease: 'power2.out',
    }, '-=0.35');

    // 虫洞环缩小形成隧道
    tl.to(warpRing, {
        scale: 1.5,
        opacity: 1,
        duration: 0.4,
        ease: 'power2.inOut',
    });

    // 最终跃迁：全部收缩到中心然后爆发
    tl.to([warpRing, core], {
        scale: 0,
        opacity: 0,
        duration: 0.3,
        ease: 'power4.in',
    }, '-=0.1');

    // 火花轨迹最后闪烁
    tl.fromTo(sparkTrail, {
        opacity: 0,
        scale: 0.5,
    }, {
        opacity: 1,
        scale: 1.2,
        duration: 0.25,
        ease: 'power2.out',
    }, '-=0.15');

    // 整体闪烁后消失
    tl.to(overlay, {
        opacity: 0,
        duration: 0.2,
        ease: 'power2.out',
    });
}

/**
 * 初始化页面过渡：拦截 NASA 按钮、星际之旅按钮与扫雷按钮点击
 */
export function initPageTransitions(): void {
    const nasaBtn = document.getElementById('btn-nasa');
    const journeyBtn = document.getElementById('btn-primary');
    const minesweeperBtn = document.getElementById('btn-minesweeper');

    if (nasaBtn) {
        nasaBtn.addEventListener('click', (e) => {
            e.preventDefault();
            executeCosmicTransition(nasaBtn, {
                targetUrl: '/nasa.html',
                duration: 1200,
            });
        });
    }

    if (journeyBtn) {
        journeyBtn.addEventListener('click', (e) => {
            e.preventDefault();
            executeCosmicTransition(journeyBtn, {
                targetUrl: '/journey.html',
                duration: 1000,
            });
        });
    }

    if (minesweeperBtn) {
        minesweeperBtn.addEventListener('click', (e) => {
            e.preventDefault();
            executeCosmicTransition(minesweeperBtn, {
                targetUrl: '/minesweeper/',
                duration: 1000,
            });
        });
    }
}
