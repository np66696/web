import { defineConfig } from 'vite';

export default defineConfig({
    build: {
        outDir: 'dist',
        emptyOutDir: true,
        // 生产优化
        minify: 'esbuild',
        cssMinify: true,
        // 资源内联阈值（<4KB 的 CSS/JS 内联到 HTML 减少请求）
        assetsInlineLimit: 4096,
        // 代码分割
        rollupOptions: {
            output: {
                manualChunks: {
                    three: ['three'],
                    gsap: ['gsap'],
                },
            },
        },
    },
    server: {
        port: 3000,
        open: true,
    },
});