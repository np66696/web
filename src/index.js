// Cloudflare Worker 入口 — 转发到动画 API
// 此文件供 wrangler dev 本地调试使用
// 生产环境请使用 wrangler.jsonc 中配置的 workers/animation-api.ts

import animationApi from '../workers/animation-api.ts';

export default animationApi;