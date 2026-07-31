// src/scripts/common-init.ts — 页面启动的共享逻辑
// 统一 WebGL 初始化、清理、HMR 处理，避免 main.ts / journey.ts 重复实现

import { initWebGLBackground, disposeWebGLBackground } from './animation-system/three-animations';

interface BootstrapOptions {
    /** 启动日志名称（用于 console 输出区分页面） */
    name: string;
    /** WebGL 背景初始化完成后的回调 */
    onReady?: () => void;
}

/**
 * 统一的页面启动流程：
 * 1. 初始化 WebGL 星空背景（失败降级，不阻塞页面）
 * 2. 调用页面特定回调
 * 3. 注册页面卸载清理 + HMR dispose
 */
export function bootstrapPage(options: BootstrapOptions): void {
    const { name, onReady } = options;

    console.log(`🚀 ${name}启动中...`);

    const webglStart = performance.now();
    initWebGLBackground()
        .then(() => {
            const elapsed = (performance.now() - webglStart).toFixed(2);
            console.log(`✅ WebGL 背景初始化完成 (${elapsed}ms)`);
        })
        .catch((err) => {
            console.warn('⚠️ WebGL 背景初始化失败 (可能浏览器不支持):', err);
        })
        .finally(() => {
            if (onReady) onReady();
            console.log(`✨ ${name}就绪！`);
        });

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
}
