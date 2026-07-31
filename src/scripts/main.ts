// src/scripts/main.ts
import '../index.css';
import { bootstrapPage } from './common-init';
import { initAllGSAPAnimations } from './animation-system/gsap-animations';
import { initAllScrollAnimations } from './animation-system/scroll-manager';
import { initPageTransitions } from './animation-system/page-transition';
import { PerformanceMonitor } from '../utils/performance-monitor';

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
bootstrapPage({
    name: '非线性动画系统',
    onReady: () => {
        // 等待 DOM 完全就绪后初始化 GSAP 动画
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initDOMAnimations);
        } else {
            initDOMAnimations();
        }
    },
});
