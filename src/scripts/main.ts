// src/scripts/main.ts
import '../index.css';
import { initWebGLBackground } from './animation-system/three-animations';
import { initAllGSAPAnimations } from './animation-system/gsap-animations';
import { initAllScrollAnimations } from './animation-system/scroll-manager';
import { PerformanceMonitor } from '../utils/performance-monitor';

/**
 * 应用程序主入口
 * 按顺序初始化所有非线性动画系统
 */
async function bootstrap(): Promise<void> {
    console.log('🚀 非线性动画系统启动中...');

    PerformanceMonitor.measureAnimationPerformance(() => {
        // 1. 初始化 WebGL 3D 背景（Three.js 粒子系统）
        initWebGLBackground().then(() => {
            console.log('✅ WebGL 背景初始化完成');
        }).catch((err) => {
            console.warn('⚠️ WebGL 背景初始化失败 (可能浏览器不支持):', err);
        });
    }, 'WebGL 初始化');

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
        // GSAP 非线性动画（Hero、卡片、交互等）
        initAllGSAPAnimations();
        console.log('✅ GSAP 动画初始化完成');
    }, 'GSAP 初始化');

    PerformanceMonitor.measureAnimationPerformance(() => {
        // 滚动驱动的非线性动画
        initAllScrollAnimations();
        console.log('✅ 滚动动画初始化完成');
    }, '滚动动画初始化');

    console.log('✨ 所有非线性动画系统就绪！');
}

// 启动应用
bootstrap().catch(console.error);

// 热更新支持 (HMR)
if (import.meta.hot) {
    import.meta.hot.accept();
}
