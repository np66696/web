// src/scripts/main.ts
import '../index.css';
import { initWebGLBackground, disposeWebGLBackground } from './animation-system/three-animations';
import { initAllGSAPAnimations } from './animation-system/gsap-animations';
import { initAllScrollAnimations, registerScrollEffect } from './animation-system/scroll-manager';
import { initPageTransitions } from './animation-system/page-transition';
import { PerformanceMonitor } from '../utils/performance-monitor';

/**
 * 应用程序主入口
 * 按顺序初始化所有非线性动画系统
 */
async function bootstrap(): Promise<void> {
    console.log('🚀 非线性动画系统启动中...');

    // 1. 异步初始化 WebGL 3D 背景（Three.js 粒子系统）
    const webglStart = performance.now();
    try {
        await initWebGLBackground();
        const webglEnd = performance.now();
        console.log(`✅ WebGL 背景初始化完成 (${(webglEnd - webglStart).toFixed(2)}ms)`);
    } catch (err) {
        console.warn('⚠️ WebGL 背景初始化失败 (可能浏览器不支持):', err);
    }

    // 2. 等待 DOM 完全就绪后初始化 GSAP 动画
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initDOMAnimations);
    } else {
        initDOMAnimations();
    }
}

/**
 * 初始化所有 DOM 相关的动画
 */
function initDOMAnimations(): void {
    PerformanceMonitor.measureAnimationPerformance(() => {
        initAllGSAPAnimations();
        console.log('✅ GSAP 动画初始化完成');
    }, 'GSAP 初始化');

    PerformanceMonitor.measureAnimationPerformance(() => {
        initAllScrollAnimations();
        console.log('✅ 滚动动画初始化完成');
    }, '滚动动画初始化');

    initPageTransitions();
    console.log('✅ 页面过渡动画就绪');

    console.log('✨ 所有非线性动画系统就绪！');
}

// 启动应用
bootstrap().catch(console.error);

// 页面卸载时清理资源（防止内存泄漏）
window.addEventListener('beforeunload', () => {
    disposeWebGLBackground();
});

// 页面隐藏时暂停非必要动画（节省资源）
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        // Three.js 的 requestAnimationFrame 在页面隐藏时自动暂停
        console.debug('🔋 页面隐藏，动画资源已自动优化');
    }
});

// 热更新支持 (HMR)
if (import.meta.hot) {
    import.meta.hot.accept();
    import.meta.hot.dispose(() => {
        disposeWebGLBackground();
    });
}
