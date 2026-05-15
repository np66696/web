// workers/animation-api.ts
/**
 * Cloudflare Worker - 动画 API
 * 提供动画配置和预设数据的 API 端点
 */

export interface AnimationPreset {
    name: string;
    type: 'elastic' | 'bounce' | 'back' | 'sine';
    duration: number;
    intensity: number;
    description: string;
}

const presets: AnimationPreset[] = [
    { name: 'gentle-elastic', type: 'elastic', duration: 1200, intensity: 0.5, description: '轻柔弹性效果' },
    { name: 'strong-elastic', type: 'elastic', duration: 1500, intensity: 1.0, description: '强力弹性效果' },
    { name: 'bounce-light', type: 'bounce', duration: 1000, intensity: 0.4, description: '轻微弹跳' },
    { name: 'bounce-heavy', type: 'bounce', duration: 1800, intensity: 1.0, description: '重弹跳' },
    { name: 'back-subtle', type: 'back', duration: 800, intensity: 0.6, description: '微妙回退' },
    { name: 'back-dramatic', type: 'back', duration: 1200, intensity: 1.7, description: '戏剧性回退' },
    { name: 'sine-wave', type: 'sine', duration: 2000, intensity: 0.3, description: '正弦波振荡' },
];

export default {
    async fetch(request: Request): Promise<Response> {
        const url = new URL(request.url);
        const path = url.pathname;

        // CORS 头
        const headers = {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        };

        if (request.method === 'OPTIONS') {
            return new Response(null, { headers });
        }

        // GET /api/presets - 获取所有动画预设
        if (path === '/api/presets' && request.method === 'GET') {
            return new Response(JSON.stringify({ presets }), { headers });
        }

        // GET /api/presets/:type - 按类型过滤
        const presetMatch = path.match(/^\/api\/presets\/(elastic|bounce|back|sine)$/);
        if (presetMatch && request.method === 'GET') {
            const filtered = presets.filter(p => p.type === presetMatch[1]);
            return new Response(JSON.stringify({ presets: filtered }), { headers });
        }

        // GET /api/easing/:name - 获取特定缓动函数参数
        const easingMatch = path.match(/^\/api\/easing\/(\w+)$/);
        if (easingMatch && request.method === 'GET') {
            const preset = presets.find(p => p.name === easingMatch[1]);
            if (preset) {
                return new Response(JSON.stringify({ preset }), { headers });
            }
            return new Response(JSON.stringify({ error: '未找到该预设' }), {
                status: 404,
                headers,
            });
        }

        // 404
        return new Response(JSON.stringify({ error: 'Not Found' }), {
            status: 404,
            headers,
        });
    },
};
