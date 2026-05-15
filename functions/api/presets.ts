// functions/api/presets.ts
// Cloudflare Pages Function — GET /api/presets

interface AnimationPreset {
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

export const onRequestGet: PagesFunction = async (context) => {
    const url = new URL(context.request.url);
    const typeFilter = url.searchParams.get('type');

    const filtered = typeFilter
        ? presets.filter((p) => p.type === typeFilter)
        : presets;

    return new Response(JSON.stringify({ presets: filtered }), {
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
        },
    });
};
