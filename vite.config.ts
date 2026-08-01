import { defineConfig, Plugin } from 'vite';
import { resolve } from 'path';
import { rmSync, readdirSync, readFileSync, writeFileSync } from 'fs';

// 构建后处理 dist 输出：
// 1. 清理 Vite 为 HTML 入口生成的多余副本（/assets/*.html 未构建源码副本，引用 /src/ 路径会 404）
// 2. 修复 canonical：Vite 会把 href="/xxx.html" 解析为资源引用并重写成 /assets/xxx-hash.html，
//    指向被清理的副本。根据页面名把 canonical 恢复为正确的页面路径。
const POST_BUILD_PAGES = [
    { name: 'index', canonical: '/' },
    { name: 'journey', canonical: '/journey.html' },
    { name: 'nasa', canonical: '/nasa.html' },
];

function postBuildCleanup() {
    const assetsDir = resolve(__dirname, 'dist/assets');

    // 1. 删除多余 HTML 副本 + .map 源码映射（避免生产环境暴露源码）
    try {
        for (const file of readdirSync(assetsDir)) {
            if (file.endsWith('.html') || file.endsWith('.map')) {
                rmSync(resolve(assetsDir, file), { force: true });
            }
        }
    } catch {
        // assets 目录不存在时无需清理
    }

    // 2. 修复每个页面的 canonical
    for (const page of POST_BUILD_PAGES) {
        const htmlPath = resolve(__dirname, `dist/${page.name}.html`);
        try {
            let html = readFileSync(htmlPath, 'utf8');
            // 匹配 Vite 重写后的 canonical（/assets/<name>-<hash>.html）
            const rewritten = new RegExp(`<link rel="canonical" href="/assets/${page.name}-[^"]+" />`);
            if (rewritten.test(html)) {
                html = html.replace(rewritten, `<link rel="canonical" href="${page.canonical}" />`);
                writeFileSync(htmlPath, html);
            }
        } catch {
            // 页面不存在时跳过
        }
    }
}

const cleanupPlugin = (): Plugin => ({
    name: 'cleanup-asset-html',
    closeBundle() {
        postBuildCleanup();
    },
});

/**
 * 修复 dev 服务器对 /minesweeper/ 的访问：
 * Vite 的 SPA fallback（htmlFallbackMiddleware）只会在 root 下查找
 * "minesweeper/index.html"，找不到就把请求重写为 /index.html（首页），
 * 而该页面实际位于 public/minesweeper/index.html。
 * 此中间件在内部中间件之前把路径改写为实际文件，仅开发服务器生效；
 * 生产构建中 dist/minesweeper/index.html 由静态托管直接提供，无需处理。
 */
const devMinesweeperRewrite = (): Plugin => ({
    name: 'dev-minesweeper-rewrite',
    apply: 'serve',
    configureServer(server) {
        server.middlewares.use((req, _res, next) => {
            if (req.url === '/minesweeper/' || req.url === '/minesweeper') {
                req.url = '/minesweeper/index.html';
            }
            next();
        });
    },
});

export default defineConfig({
    plugins: [cleanupPlugin(), devMinesweeperRewrite()],
    build: {
        outDir: 'dist',
        emptyOutDir: true,
        minify: 'esbuild',
        cssMinify: true,
        assetsInlineLimit: 4096,
        target: 'es2020',
        sourcemap: 'hidden',
        chunkSizeWarningLimit: 550,
        modulePreload: { polyfill: false },
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'index.html'),
                nasa: resolve(__dirname, 'nasa.html'),
                journey: resolve(__dirname, 'journey.html'),
            },
            output: {
                // three.js 主入口是预打包单文件，内部高度耦合，Rollup 无法有效 tree-shake。
                // 通过 manualChunks 将其固定为独立 chunk，获得长期缓存（只加载一次）。
                manualChunks: {
                    three: ['three'],
                    gsap: ['gsap'],
                },
            },
        },
        // 生产构建时移除所有 console 和 debugger 语句，防止信息泄露
        esbuild: {
            target: 'es2020',
            drop: ['console', 'debugger'],
            legalComments: 'none',
        },
    },
    server: {
        port: 3000,
        open: true,
    },
});
