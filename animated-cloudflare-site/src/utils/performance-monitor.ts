// src/scripts/utils/performance-monitor.ts
export class PerformanceMonitor {
    static measureAnimationPerformance(callback: () => void, name: string) {
        const start = performance.now();
        callback();
        const end = performance.now();
        
        console.log(`${name} 执行时间: ${(end - start).toFixed(2)}ms`);
        
        if (end - start > 16) { // 超过 60fps 的阈值
            console.warn(`${name} 性能警告: 可能丢帧`);
        }
    }
}