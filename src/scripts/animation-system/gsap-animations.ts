// src/scripts/animation-system/gsap-animations.ts
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { PerformanceMonitor } from '../../utils/performance-monitor';

// 注册 GSAP 插件
gsap.registerPlugin(ScrollTrigger);

/**
 * 非线性缓动函数集合
 * 这些函数产生比标准 CSS easing 更丰富的动画效果
 */
export const EasingFunctions = {
    /** 弹性缓出 - 到达终点后振荡回弹 */
    elasticOut: (t: number): number => {
        if (t === 0 || t === 1) return t;
        return Math.pow(2, -10 * t) * Math.sin((t - 0.075) * (2 * Math.PI) / 0.3) + 1;
    },

    /** 弹性缓入 - 从起点开始振荡加速 */
    elasticIn: (t: number): number => {
        if (t === 0 || t === 1) return t;
        return -(Math.pow(2, 10 * (t - 1)) * Math.sin((t - 1.075) * (2 * Math.PI) / 0.3));
    },

    /** 弹性缓入缓出 */
    elasticInOut: (t: number): number => {
        if (t === 0 || t === 1) return t;
        if (t < 0.5) {
            return -0.5 * (Math.pow(2, 10 * (t * 2 - 1)) * Math.sin((t * 2 - 1.075) * (2 * Math.PI) / 0.3));
        }
        return 0.5 * Math.pow(2, -10 * (t * 2 - 1)) * Math.sin((t * 2 - 1.075) * (2 * Math.PI) / 0.3) + 1;
    },

    /** 弹跳缓出 - 模拟物理弹跳 */
    bounceOut: (t: number): number => {
        const n1 = 7.5625;
        const d1 = 2.75;
        if (t < 1 / d1) {
            return n1 * t * t;
        } else if (t < 2 / d1) {
            return n1 * (t -= 1.5 / d1) * t + 0.75;
        } else if (t < 2.5 / d1) {
            return n1 * (t -= 2.25 / d1) * t + 0.9375;
        }
        return n1 * (t -= 2.625 / d1) * t + 0.984375;
    },

    /** 回退缓出 - 过冲后回退 */
    backOut: (t: number): number => {
        const c1 = 1.70158;
        const c3 = c1 + 1;
        return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    },

    /** 回退缓入 */
    backIn: (t: number): number => {
        const c1 = 1.70158;
        const c3 = c1 + 1;
        return c3 * t * t * t - c1 * t * t;
    },

    /** 正弦波调制 - 用于创建波浪感 */
    sineWave: (t: number, frequency: number = 3, amplitude: number = 0.1): number => {
        return t + Math.sin(t * Math.PI * 2 * frequency) * amplitude * (1 - t);
    },
};

/**
 * 使用自定义非线性缓动函数执行动画
 * @param callback 每帧回调，接收 0-1 的进度值
 * @param duration 持续时间 (ms)
 * @param easing 缓动函数
 */
export function animateWithCustomEasing(
    callback: (progress: number) => void,
    duration: number,
    easing: (t: number) => number = EasingFunctions.elasticOut
): gsap.core.Tween {
    const obj = { t: 0 };
    return gsap.to(obj, {
        t: 1,
        duration: duration / 1000,
        ease: 'none',
        onUpdate: () => {
            const easedProgress = easing(obj.t);
            callback(easedProgress);
        },
    });
}

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

    const magnetize = (e: MouseEvent) => {
        const rect = btn!.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        // 非线性映射：距离越近移动越大
        const deltaX = (e.clientX - centerX) * 0.3;
        const deltaY = (e.clientY - centerY) * 0.3;

        gsap.to(btn, {
            x: deltaX,
            y: deltaY,
            duration: 0.3,
            ease: 'power2.out',
        });
    };

    const demagnetize = () => {
        gsap.to(btn, {
            x: 0,
            y: 0,
            duration: 0.6,
            ease: 'elastic.out(1, 0.3)',
        });
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
        const ripple = document.createElement('div');
        ripple.className = 'absolute inset-0 rounded-full bg-blue-400/30';
        ripple.style.cssText = 'position:absolute;inset:0;border-radius:50%;';
        ball.style.position = 'relative';
        ball.style.overflow = 'visible';
        ball.appendChild(ripple);

        gsap.fromTo(ripple, {
            scale: 0.8,
            opacity: 0.8,
        }, {
            scale: 2.5,
            opacity: 0,
            duration: 0.8,
            ease: 'power3.out',
            onComplete: () => ripple.remove(),
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
    let animationId: number | null = null;

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

        if (Math.abs(velocity) > 0.1) {
            animationId = requestAnimationFrame(applyInertia);
        } else {
            // 弹回原位
            gsap.to(content, {
                y: 0,
                duration: 0.8,
                ease: 'elastic.out(0.6, 0.3)',
            });
            animationId = null;
        }
    };

    container.addEventListener('wheel', (e) => {
        e.preventDefault();
        velocity += e.deltaY * 0.15;

        if (!animationId) {
            animationId = requestAnimationFrame(applyInertia);
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
