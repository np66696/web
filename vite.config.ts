import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
    build: {
        outDir: 'dist',
        emptyOutDir: true,
        minify: 'esbuild',
        cssMinify: true,
        assetsInlineLimit: 4096,
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'index.html'),
                nasa: resolve(__dirname, 'nasa.html'),
                journey: resolve(__dirname, 'journey.html'),
            },
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