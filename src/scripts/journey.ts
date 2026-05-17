// src/scripts/journey.ts — 星际航行控制台独立页面入口
import '../index.css';
import { initWebGLBackground, disposeWebGLBackground } from './animation-system/three-animations';
import gsap from 'gsap';

/**
 * 行星坐标映射
 */
const planetPositions: Record<string, { cx: number; cy: number; label: string }> = {
    mars: { cx: 310, cy: 140, label: '火星基地 · Mars Base' },
    jupiter: { cx: 80, cy: 285, label: '木星轨道 · Jupiter Orbit' },
    saturn: { cx: 335, cy: 315, label: '土星光环 · Saturn Rings' },
    andromeda: { cx: 45, cy: 65, label: '仙女座星系 · Andromeda' },
};

/** 目的地对应的飞船状态 */
const destinationStats: Record<string, Array<{ id: string; val: number; color: string }>> = {
    mars: [
        { id: 'fuel', val: 87, color: 'from-indigo-500 to-purple-500' },
        { id: 'thrust', val: 94, color: 'from-violet-500 to-purple-500' },
        { id: 'life', val: 99, color: 'from-emerald-500 to-teal-500' },
        { id: 'shield', val: 76, color: 'from-cyan-500 to-blue-500' },
    ],
    jupiter: [
        { id: 'fuel', val: 62, color: 'from-orange-500 to-amber-500' },
        { id: 'thrust', val: 88, color: 'from-amber-500 to-yellow-500' },
        { id: 'life', val: 95, color: 'from-emerald-500 to-teal-500' },
        { id: 'shield', val: 81, color: 'from-cyan-500 to-blue-500' },
    ],
    saturn: [
        { id: 'fuel', val: 48, color: 'from-amber-500 to-yellow-500' },
        { id: 'thrust', val: 82, color: 'from-orange-500 to-red-500' },
        { id: 'life', val: 91, color: 'from-emerald-500 to-teal-500' },
        { id: 'shield', val: 70, color: 'from-sky-500 to-cyan-500' },
    ],
    andromeda: [
        { id: 'fuel', val: 95, color: 'from-purple-500 to-pink-500' },
        { id: 'thrust', val: 97, color: 'from-fuchsia-500 to-purple-500' },
        { id: 'life', val: 88, color: 'from-teal-500 to-cyan-500' },
        { id: 'shield', val: 92, color: 'from-violet-500 to-indigo-500' },
    ],
};

/**
 * 初始化目的地卡片交互
 */
function initDestinations(): void {
    const cards = document.querySelectorAll('.destination-card');
    const routeLine = document.getElementById('journey-route') as unknown as SVGLineElement;
    const shipMarker = document.getElementById('ship-marker') as unknown as SVGCircleElement;
    const destLabel = document.getElementById('journey-dest-label');

    cards.forEach(card => {
        card.addEventListener('click', () => {
            cards.forEach(c => c.classList.remove('active'));
            (card as HTMLElement).classList.add('active');

            const dest = (card as HTMLElement).dataset.dest;
            if (!dest || !planetPositions[dest]) return;

            const pos = planetPositions[dest];

            // 更新航线
            if (routeLine) {
                gsap.to(routeLine, {
                    attr: { x2: pos.cx, y2: pos.cy },
                    duration: 0.6,
                    ease: 'power2.inOut',
                });
            }

            // 更新飞船标记
            if (shipMarker) {
                gsap.to(shipMarker, {
                    attr: { cx: pos.cx, cy: pos.cy },
                    duration: 0.6,
                    ease: 'power2.inOut',
                });
            }

            // 更新标签
            if (destLabel) {
                gsap.to(destLabel, {
                    opacity: 0,
                    duration: 0.15,
                    onComplete: () => {
                        destLabel.textContent = pos.label;
                        gsap.to(destLabel, { opacity: 1, duration: 0.3 });
                    },
                });
            }

            // 更新飞船状态条
            const stats = destinationStats[dest];
            if (stats) {
                stats.forEach(stat => {
                    const bar = document.getElementById(`bar-${stat.id}`);
                    const label = document.getElementById(`stat-${stat.id}`);
                    if (bar) {
                        bar.style.width = `${stat.val}%`;
                        bar.className = `h-full rounded-full bg-gradient-to-r ${stat.color} transition-all duration-700`;
                    }
                    if (label) {
                        label.textContent = `${stat.val}%`;
                    }
                });
            }
        });
    });
}

/**
 * 初始化启动按钮特效
 */
function initLaunchButton(): void {
    const btn = document.getElementById('btn-launch');
    if (!btn) return;

    btn.addEventListener('click', () => {
        const tl = gsap.timeline();

        // 全屏闪光
        const flash = document.createElement('div');
        flash.style.cssText = `
            position: fixed; inset: 0; z-index: 100;
            background: white; pointer-events: none; opacity: 0;
        `;
        document.body.appendChild(flash);

        tl.to(flash, { opacity: 0.9, duration: 0.08, ease: 'power2.out' });
        tl.to(flash, {
            opacity: 0, duration: 0.7, ease: 'power3.in',
            onComplete: () => flash.remove(),
        });

        // 整页震动
        const app = document.getElementById('journey-app');
        if (app) {
            tl.to(app, {
                scale: 1.03, duration: 0.04, yoyo: true, repeat: 7, ease: 'power2.inOut',
            }, '-=0.55');
        }
    });
}

/**
 * 返回首页过渡
 */
function initBackTransition(): void {
    const backBtn = document.getElementById('btn-back-home');
    if (!backBtn) return;

    backBtn.addEventListener('click', (e) => {
        e.preventDefault();

        // 简易跃迁动画
        const overlay = document.getElementById('cosmic-transition');
        if (!overlay) {
            window.location.href = '/';
            return;
        }

        gsap.set(overlay, {
            display: 'flex',
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
            opacity: 0,
            background: 'radial-gradient(circle at 50% 50%, rgba(2,5,16,0.98) 0%, rgba(5,10,30,0.95) 30%, rgba(10,15,50,0.8) 60%, rgba(20,30,80,0.3) 100%)',
        });

        const tl = gsap.timeline({
            onComplete: () => { window.location.href = '/'; },
        });

        tl.to(overlay, { opacity: 1, duration: 0.3, ease: 'power2.in' });
        tl.to(overlay, { opacity: 0, duration: 0.3, ease: 'power2.out' }, '+=0.15');
    });
}

/**
 * 入场动画
 */
function playEntranceAnimation(): void {
    const tl = gsap.timeline();

    tl.fromTo('#journey-app', {
        scale: 0.92,
        opacity: 0,
        filter: 'blur(10px)',
    }, {
        scale: 1,
        opacity: 1,
        filter: 'blur(0px)',
        duration: 0.6,
        ease: 'power3.out',
    });

    tl.fromTo('#journey-left', {
        x: -60,
        opacity: 0,
    }, {
        x: 0,
        opacity: 1,
        duration: 0.5,
        ease: 'power3.out',
    }, '-=0.2');

    tl.fromTo('#journey-right', {
        x: 60,
        opacity: 0,
    }, {
        x: 0,
        opacity: 1,
        duration: 0.5,
        ease: 'power3.out',
    }, '-=0.4');

    tl.fromTo('#journey-center', {
        scale: 0.6,
        opacity: 0,
    }, {
        scale: 1,
        opacity: 1,
        duration: 0.6,
        ease: 'elastic.out(0.8, 0.4)',
    }, '-=0.3');
}

/**
 * 启动
 */
async function bootstrap(): Promise<void> {
    console.log('🚀 星际航行控制台启动中...');

    // WebGL 星空背景
    try {
        await initWebGLBackground();
        console.log('✅ WebGL 背景就绪');
    } catch (err) {
        console.warn('⚠️ WebGL 背景初始化失败:', err);
    }

    // 交互初始化
    initDestinations();
    initLaunchButton();
    initBackTransition();

    // 入场动画
    playEntranceAnimation();

    console.log('✨ 星际航行控制台就绪！');
}

bootstrap().catch(console.error);

// 清理
window.addEventListener('beforeunload', () => {
    disposeWebGLBackground();
});

// HMR
if (import.meta.hot) {
    import.meta.hot.accept();
    import.meta.hot.dispose(() => disposeWebGLBackground());
}
