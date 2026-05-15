// Cloudflare Worker — 纯静态站点入口
// 所有静态资源在 assets.directory (dist/) 中自动服务
export default {
  async fetch(request: Request, env: any, ctx: any): Promise<Response> {
    // Workers Assets 会自动处理静态文件路由
    // 这个 handler 是兜底逻辑
    return new Response('Not Found', { status: 404 });
  },
};
