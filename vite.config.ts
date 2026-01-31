import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
    root: './src',
    build: {
        outDir: '../dist',
        emptyOutDir: true,
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'src/index.html')
            }
        }
    },
    server: {
        port: 3000,
        open: true,
        proxy: {
            '/api': {
                target: 'http://localhost:8787',
                changeOrigin: true
            }
        }
    }
});