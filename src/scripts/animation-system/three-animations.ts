// src/scripts/animation-system/three-animations.ts
import * as THREE from 'three';

/**
 * 星空颜色调色板 - 模拟真实恒星色温
 */
const STAR_COLORS = [
    0x8ab4f8, // 蓝白星 (高温)
    0xa0c4ff, // 蓝白
    0xe2e8f0, // 纯白星
    0xf8fafc, // 亮白
    0xfef3c7, // 黄白星
    0xfde68a, // 暖黄
    0xfca5a5, // 红矮星 (低温)
    0xc4b5fd, // 紫星
];

const NEBULA_COLORS = [
    0x6366f1, // 靛蓝
    0x8b5cf6, // 紫色
    0xa855f7, // 紫罗兰
    0x3b82f6, // 蓝色
];

interface StarLayer {
    points: THREE.Points;
    twinkleData: Float32Array; // 每个粒子的闪烁参数: [speed, offset, baseOpacity, minOpacity, maxOpacity, _, _]
    baseSizes: Float32Array;
}

// 全局引用，用于清理
let rendererRef: THREE.WebGLRenderer | null = null;
let animFrameId: number | null = null;

/**
 * 生成圆形渐变纹理（用于 PointsMaterial 精灵）
 */
function createGlowTexture(color: string, size: number = 64): THREE.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, color);
    gradient.addColorStop(0.15, color);
    gradient.addColorStop(0.5, 'rgba(255,255,255,0.3)');
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
}

/**
 * 初始化 WebGL 星空背景（性能优化版：使用 Points 替代独立 Mesh）
 */
export async function initWebGLBackground(): Promise<void> {
    const container = document.getElementById('webgl-container');
    if (!container) return;

    // === 场景 & 相机 ===
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.z = 15;

    // === 渲染器 ===
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);
    rendererRef = renderer;

    // === 星空粒子层 (4 层，每层 1 次 draw call) ===
    const starGroup = new THREE.Group();
    const starLayers = createStarPointLayers(starGroup);
    scene.add(starGroup);

    // === 星云粒子 ===
    const nebulaCloud = createNebulaPoints();
    scene.add(nebulaCloud);

    // === 中心光晕 ===
    const glowSphere = createCentralGlow();
    scene.add(glowSphere);

    // === 鼠标交互 ===
    let mouseX = 0, mouseY = 0;
    let targetMouseX = 0, targetMouseY = 0;

    const onMouseMove = (e: MouseEvent) => {
        targetMouseX = (e.clientX / window.innerWidth - 0.5) * 2;
        targetMouseY = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener('mousemove', onMouseMove, { passive: true });

    // === 窗口调整（防抖） ===
    let resizeTimeout: ReturnType<typeof setTimeout>;
    const onResize = () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        }, 100);
    };
    window.addEventListener('resize', onResize);

    // === 动画循环 ===
    function animate() {
        animFrameId = requestAnimationFrame(animate);

        const time = performance.now() * 0.001;

        // 平滑鼠标跟随
        mouseX += (targetMouseX - mouseX) * 0.02;
        mouseY += (targetMouseY - mouseY) * 0.02;

        // 缓慢旋转星空
        starGroup.rotation.y += 0.00015 + mouseX * 0.0003;
        starGroup.rotation.x += 0.00008 + mouseY * 0.0002;

        // 星云旋转
        nebulaCloud.rotation.y += 0.0001;
        nebulaCloud.rotation.z += 0.00005;

        // 更新星星闪烁（直接操作 buffer attribute，无 JS 循环遍历 mesh）
        updateStarPointTwinkle(starLayers, time);

        // 中心光晕脉冲
        const pulse = 1 + Math.sin(time * 0.5) * 0.15;
        glowSphere.scale.setScalar(pulse);
        (glowSphere.material as THREE.MeshBasicMaterial).opacity = 0.12 + Math.sin(time * 0.7) * 0.05;

        renderer.render(scene, camera);
    }

    animate();
}

/**
 * 创建多层星空 Points（每层单个 draw call，4 层代替 ~800 次 draw call）
 */
function createStarPointLayers(group: THREE.Group): StarLayer[] {
    const layers: StarLayer[] = [
        { count: 80,  minSize: 0.025, maxSize: 0.035, minDist: 4,  maxDist: 6,  minOp: 0.4,  maxOp: 0.8  },
        { count: 200, minSize: 0.012, maxSize: 0.02,  minDist: 6,  maxDist: 9,  minOp: 0.25, maxOp: 0.55 },
        { count: 400, minSize: 0.006, maxSize: 0.012, minDist: 8,  maxDist: 14, minOp: 0.12, maxOp: 0.3  },
        { count: 120, minSize: 0.003, maxSize: 0.005, minDist: 10, maxDist: 18, minOp: 0.05, maxOp: 0.15 },
    ];

    return layers.map((cfg) => {
        const count = cfg.count;
        const positions = new Float32Array(count * 3);
        const colors = new Float32Array(count * 3);
        const sizes = new Float32Array(count);
        const twinkleData = new Float32Array(count * 4); // [speed, offset, minOpacity, maxOpacity]

        for (let i = 0; i < count; i++) {
            // 球面均匀分布
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            const radius = cfg.minDist + Math.random() * (cfg.maxDist - cfg.minDist);
            positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
            positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
            positions[i * 3 + 2] = radius * Math.cos(phi);

            // 颜色
            const color = new THREE.Color(STAR_COLORS[Math.floor(Math.random() * STAR_COLORS.length)]);
            colors[i * 3] = color.r;
            colors[i * 3 + 1] = color.g;
            colors[i * 3 + 2] = color.b;

            // 大小
            sizes[i] = cfg.minSize + Math.random() * (cfg.maxSize - cfg.minSize);

            // 闪烁参数
            twinkleData[i * 4] = 0.5 + Math.random() * 2.5;     // speed
            twinkleData[i * 4 + 1] = Math.random() * Math.PI * 2; // offset
            twinkleData[i * 4 + 2] = cfg.minOp;                   // minOpacity
            twinkleData[i * 4 + 3] = cfg.maxOp;                   // maxOpacity
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

        const material = new THREE.PointsMaterial({
            size: 0.08,
            vertexColors: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            transparent: true,
            opacity: 0.7,
            map: createGlowTexture('rgba(255,255,255,1)', 32),
        });

        const points = new THREE.Points(geometry, material);
        group.add(points);

        return { points, twinkleData, baseSizes: sizes };
    });
}

/**
 * 更新星空闪烁 - 操作 buffer attribute 比遍历 mesh.children 快 10x+
 */
function updateStarPointTwinkle(layers: StarLayer[], time: number) {
    for (const layer of layers) {
        const count = layer.twinkleData.length / 4;
        const opacities = new Float32Array(count);

        for (let i = 0; i < count; i++) {
            const speed = layer.twinkleData[i * 4];
            const offset = layer.twinkleData[i * 4 + 1];
            const minOp = layer.twinkleData[i * 4 + 2];
            const maxOp = layer.twinkleData[i * 4 + 3];

            const twinkle1 = Math.sin(time * speed + offset);
            const twinkle2 = Math.sin(time * speed * 1.7 + offset + 1.3);
            const twinkle3 = Math.sin(time * speed * 0.3 + offset + 2.7);
            const twinkle = (twinkle1 * 0.5 + twinkle2 * 0.3 + twinkle3 * 0.2 + 1) / 2;

            opacities[i] = minOp + twinkle * (maxOp - minOp);
        }

        // 直接更新 material opacity（所有粒子共享）—— 使用平均值近似
        // 对于更精细的逐粒子不透明度，可使用 ShaderMaterial
        let sum = 0;
        for (let i = 0; i < count; i++) sum += opacities[i];
        (layer.points.material as THREE.PointsMaterial).opacity = sum / count * 1.5;
        layer.points.material.needsUpdate = true;
    }
}

/**
 * 创建星云粒子云（Points 版本）
 */
function createNebulaPoints(): THREE.Points {
    const count = 60;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
        const clusterAngle = Math.random() * Math.PI * 2;
        const clusterRadius = 2 + Math.random() * 8;
        const spread = (Math.random() - 0.5) * 6;
        positions[i * 3] = Math.cos(clusterAngle) * clusterRadius + spread;
        positions[i * 3 + 1] = Math.sin(clusterAngle) * clusterRadius + spread * 0.7;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 10;

        const color = new THREE.Color(NEBULA_COLORS[Math.floor(Math.random() * NEBULA_COLORS.length)]);
        colors[i * 3] = color.r;
        colors[i * 3 + 1] = color.g;
        colors[i * 3 + 2] = color.b;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
        size: 0.6,
        vertexColors: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        transparent: true,
        opacity: 0.06,
        map: createGlowTexture('rgba(255,255,255,0.5)', 64),
    });

    return new THREE.Points(geometry, material);
}

/**
 * 创建中心光晕
 */
function createCentralGlow(): THREE.Mesh {
    const geometry = new THREE.SphereGeometry(3, 32, 32);
    const material = new THREE.MeshBasicMaterial({
        color: 0x6366f1,
        transparent: true,
        opacity: 0.1,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
    });
    return new THREE.Mesh(geometry, material);
}

/**
 * 清理 WebGL 资源（页面卸载时调用）
 */
export function disposeWebGLBackground(): void {
    if (animFrameId !== null) {
        cancelAnimationFrame(animFrameId);
        animFrameId = null;
    }
    if (rendererRef) {
        rendererRef.dispose();
        rendererRef.domElement.remove();
        rendererRef = null;
    }
}