// Cloudflare Worker — 纯静态站点入口
// Workers Assets 自动处理 dist/ 中的静态文件
export default {
  async fetch(request, env, ctx) {
    // 所有静态文件由 Workers Assets 自动路由
    return new Response('Not Found', { status: 404 });
  },
};
