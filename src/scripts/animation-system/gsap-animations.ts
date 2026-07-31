// src/scripts/animation-system/gsap-animations.ts
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { PerformanceMonitor } from '../../utils/performance-monitor';

// 注册 GSAP 插件
gsap.registerPlugin(ScrollTrigger);

/**
 * 初始化 Hero 区域非线性入场动画
 */
export function initHeroAnimations(): void {
    PerformanceMonitor.measureAnimationPerformance(() => {
        const tl = gsap.timeline({ defaults: { ease: 'elastic.out(1, 0.5)' } });

        // 标题：从上方弹入
        tl.fromTo('#hero-title',
            { y: -100, opacity: 0, scale: 0.8 },
            { y: 0, opacity: 1, scale: 1, duration: 1.2 },
        );

        // 副标题：延迟后弹性出现
        tl.fromTo('#hero-subtitle',
            { y: 50, opacity: 0 },
            { y: 0, opacity: 1, duration: 0.8 },
            '-=0.6',
        );

        // 按钮：交错弹入
        tl.fromTo('#btn-primary',
            { scale: 0, opacity: 0 },
            { scale: 1, opacity: 1, duration: 0.7, ease: 'back.out(1.7)' },
            '-=0.3',
        );
        tl.fromTo('#btn-nasa',
            { scale: 0, opacity: 0 },
            { scale: 1, opacity: 1, duration: 0.7, ease: 'back.out(1.7)' },
            '-=0.5',
        );

        // Hero badge 淡入
        tl.fromTo('#hero-badge',
            { y: -20, opacity: 0 },
            { y: 0, opacity: 1, duration: 0.6, ease: 'power2.out' },
            '-=0.8',
        );

    }, 'Hero 动画');
}

/**
 * 初始化弹性演示卡片入场动画
 */
export function initCardAnimations(): void {
    PerformanceMonitor.measureAnimationPerformance(() => {
        const cards = gsap.utils.toArray<HTMLElement>('.card');

        gsap.fromTo(cards, {
            y: 80,
            opacity: 0,
            rotateX: 15,
        }, {
            y: 0,
            opacity: 1,
            rotateX: 0,
            duration: 1,
            stagger: 0.2,
            ease: 'elastic.out(0.8, 0.4)',
            scrollTrigger: {
                trigger: '#celestial-bodies',
                start: 'top 75%',
                toggleActions: 'play none none none',
            },
        });
    }, '卡片动画');
}

/**
 * 初始化磁性按钮效果（鼠标跟随非线性移动）
 */
export function initMagneticButton(): void {
    const btn = document.getElementById('magnetic-btn');
    if (!btn) return;

    // quickTo: 预创建缓动，mousemove 时仅更新目标值，避免每像素新建 tween
    const quickX = gsap.quickTo(btn, 'x', { duration: 0.3, ease: 'power2.out' });
    const quickY = gsap.quickTo(btn, 'y', { duration: 0.3, ease: 'power2.out' });

    const magnetize = (e: MouseEvent) => {
        const rect = btn.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        // 非线性映射：距离越近移动越大
        quickX((e.clientX - centerX) * 0.3);
        quickY((e.clientY - centerY) * 0.3);
    };

    const demagnetize = () => {
        quickX(0);
        quickY(0);
    };

    btn.addEventListener('mousemove', magnetize);
    btn.addEventListener('mouseleave', demagnetize);
}

/**
 * 初始化弹簧球动画（点击触发非线性弹跳）
 */
export function initSpringBall(): void {
    const ball = document.getElementById('spring-ball');
    if (!ball) return;

    // 复用单个 ripple 元素，避免每次点击创建 + 销毁 DOM
    const ripple = document.createElement('div');
    ripple.className = 'spring-ripple';
    ripple.style.cssText = 'position:absolute;inset:0;border-radius:50%;pointer-events:none;';
    ball.style.position = 'relative';
    ball.style.overflow = 'visible';
    ball.appendChild(ripple);

    ball.addEventListener('click', () => {
        // 非线性缩小再弹回
        const tl = gsap.timeline();
        tl.to(ball, {
            scale: 0.7,
            duration: 0.15,
            ease: 'power2.in',
        })
        .to(ball, {
            scale: 1.15,
            duration: 0.3,
            ease: 'elastic.out(1, 0.4)',
        })
        .to(ball, {
            scale: 1,
            duration: 0.2,
            ease: 'power2.out',
        });

        // 同时产生波纹
        gsap.fromTo(ripple, {
            scale: 0.8,
            opacity: 0.8,
        }, {
            scale: 2.5,
            opacity: 0,
            duration: 0.8,
            ease: 'power3.out',
        });
    });
}

/**
 * 初始化惯性滚动效果（非线性衰减）
 */
export function initInertiaScroll(): void {
    const container = document.getElementById('inertia-scroll');
    const content = container?.querySelector('.inertia-content') as HTMLElement;
    if (!container || !content) return;

    let velocity = 0;
    let animating = false;

    const applyInertia = () => {
        // 非线性衰减：使用指数衰减
        velocity *= 0.92;

        const currentY = gsap.getProperty(content, 'y') as number;
        const newY = currentY + velocity;

        // 超出边界时的回弹
        const maxScroll = 40;
        if (Math.abs(newY) > maxScroll) {
            velocity *= -0.4; // 非线性回弹系数
        }

        gsap.set(content, { y: Math.max(-maxScroll, Math.min(maxScroll, newY)) });

        if (Math.abs(velocity) <= 0.1) {
            // 停止惯性，弹回原位，并从 ticker 中移除自身
            animating = false;
            gsap.ticker.remove(applyInertia);
            gsap.to(content, {
                y: 0,
                duration: 0.8,
                ease: 'elastic.out(0.6, 0.3)',
            });
        }
    };

    // 使用 GSAP 的 ticker 替代手写 requestAnimationFrame，
    // 由 GSAP 统一调度，避免混用两套循环
    container.addEventListener('wheel', (e) => {
        e.preventDefault();
        velocity += e.deltaY * 0.15;

        if (!animating) {
            animating = true;
            gsap.ticker.add(applyInertia);
        }
    }, { passive: false });
}

/**
 * 初始化所有 GSAP 非线性动画
 */
export function initAllGSAPAnimations(): void {
    initHeroAnimations();
    initCardAnimations();
    initMagneticButton();
    initSpringBall();
    initInertiaScroll();
}
