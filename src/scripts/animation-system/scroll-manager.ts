// src/scripts/animation-system/scroll-manager.ts
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/**
 * 非线性滚动进度映射
 * 将线性滚动进度转换为非线性进度
 */
export function nonlinearProgress(linear: number, type: 'easeIn' | 'easeOut' | 'parallax' | 'wave' = 'easeOut'): number {
    const clamped = Math.max(0, Math.min(1, linear));

    switch (type) {
        case 'easeIn':
            // 幂函数缓入
            return Math.pow(clamped, 3);

        case 'easeOut':
            // 幂函数缓出
            return 1 - Math.pow(1 - clamped, 3);

        case 'parallax':
            // 视差映射：开始快，后面慢
            return clamped * (2 - clamped);

        case 'wave':
            // 波浪式：带有正弦振荡
            return clamped + Math.sin(clamped * Math.PI * 2) * 0.05 * (1 - clamped);

        default:
            return clamped;
    }
}

/**
 * 初始化视差滚动效果
 * 不同层级以不同非线性速率移动
 */
export function initParallaxScrolling(): void {
    const layers = gsap.utils.toArray<HTMLElement>('.parallax-layer .scroll-item');

    layers.forEach((item, index) => {
        // 每层不同的视差速率（非线性间隔）
        const speed = 0.3 + index * 0.2;
        const direction = index % 2 === 0 ? 1 : -1;

        gsap.fromTo(item, {
            y: 100 * direction,
            opacity: 0,
        }, {
            y: -100 * direction,
            opacity: 1,
            ease: 'none',
            scrollTrigger: {
                trigger: '#cosmic-journey',
                start: 'top bottom',
                end: 'bottom top',
                scrub: 0.8,
            },
        });
    });

    // 视觉元素的非线性缩放
    const visuals = gsap.utils.toArray<HTMLElement>('.scroll-visual');
    visuals.forEach((visual, index) => {
        const scaleStart = 0.5 + index * 0.2;
        gsap.fromTo(visual, {
            scale: scaleStart,
            rotate: -15 * (index + 1),
        }, {
            scale: 1.2,
            rotate: 15 * (index + 1),
            ease: 'power1.inOut',
            scrollTrigger: {
                trigger: '#cosmic-journey',
                start: 'top 80%',
                end: 'bottom 20%',
                scrub: 0.6,
            },
        });
    });
}

/**
 * 初始化交错入场动画（非线性 stagger）
 */
export function initStaggerReveal(): void {
    const items = gsap.utils.toArray<HTMLElement>('.scroll-item');

    ScrollTrigger.batch(items, {
        onEnter: (batch) => {
            gsap.fromTo(batch, {
                y: 80,
                opacity: 0,
                scale: 0.9,
            }, {
                y: 0,
                opacity: 1,
                scale: 1,
                duration: 1,
                // 非线性交错：使用指数间隔
                stagger: (index: number) => Math.pow(index + 1, 1.5) * 0.08,
                ease: 'elastic.out(0.7, 0.3)',
            });
        },
        start: 'top 85%',
    });
}

/**
 * 初始化滚动指示器动画
 * 根据滚动进度非线性渐变消失
 */
export function initScrollIndicator(): void {
    const indicator = document.getElementById('scroll-indicator');
    if (!indicator) return;

    gsap.to(indicator, {
        opacity: 0,
        y: -20,
        scrollTrigger: {
            trigger: '#hero',
            start: 'top top',
            end: 'bottom top',
            scrub: 0.5,
        },
    });
}

/**
 * 初始化滚动驱动的非线性进度条变化
 */
export function initScrollProgressEffects(): void {
    // 页面滚动整体进度
    gsap.to('body', {
        scrollTrigger: {
            trigger: 'body',
            start: 'top top',
            end: 'bottom bottom',
            scrub: 0.3,
            onUpdate: (self) => {
                // 非线性进度映射
                const progress = nonlinearProgress(self.progress, 'easeOut');
                // 可以在此处驱动其他基于进度的效果
                document.documentElement.style.setProperty('--scroll-progress', progress.toString());
            },
        },
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

    // 刷新 ScrollTrigger
    ScrollTrigger.refresh();
}
