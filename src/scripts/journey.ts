// src/scripts/journey.ts — 群星导航页独立入口
import '../index.css';
import { bootstrapPage } from './common-init';
import { gsap } from 'gsap';

/**
 * 入场动画
 */
function playEntranceAnimation(): void {
    const tl = gsap.timeline();

    // 整体 Hero 区域淡入
    tl.fromTo('#hero .relative.z-10', {
        scale: 0.92,
        opacity: 0,
        filter: 'blur(10px)',
    }, {
        scale: 1,
        opacity: 1,
        filter: 'blur(0px)',
        duration: 0.8,
        ease: 'power3.out',
    });

    // 标题字符逐个出现
    const title = document.querySelector('#hero h1');
    if (title) {
        tl.fromTo(title, {
            y: 40,
            opacity: 0,
        }, {
            y: 0,
            opacity: 1,
            duration: 0.7,
            ease: 'power3.out',
        }, '-=0.5');
    }

    // 按钮依次弹入（使用 data-link-type 定位，避免 URL 子串选择器脆弱）
    tl.fromTo('#hero a[data-link-type="wiki"]', {
        y: 30,
        opacity: 0,
        scale: 0.8,
    }, {
        y: 0,
        opacity: 1,
        scale: 1,
        duration: 0.5,
        ease: 'back.out(1.4)',
    }, '-=0.3');

    tl.fromTo('#hero a[data-link-type="steam"]', {
        y: 30,
        opacity: 0,
        scale: 0.8,
    }, {
        y: 0,
        opacity: 1,
        scale: 1,
        duration: 0.5,
        ease: 'back.out(1.4)',
    }, '-=0.3');

    // Footer 淡入
    tl.fromTo('footer', {
        opacity: 0,
        y: 20,
    }, {
        opacity: 1,
        y: 0,
        duration: 0.5,
    }, '-=0.2');
}

/**
 * 返回主页过渡动画
 */
function initBackTransition(): void {
    const backLink = document.querySelector('a[href="/"]');
    if (!backLink) return;

    backLink.addEventListener('click', (e) => {
        e.preventDefault();

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

// 启动
bootstrapPage({
    name: '群星导航站',
    onReady: () => {
        // 返回主页过渡动画
        initBackTransition();

        // 入场动画
        playEntranceAnimation();
    },
});
