// src/scripts/animation-system/three-animations.ts
import * as THREE from 'three';

interface StarData {
    twinkleSpeed: number;
    twinkleOffset: number;
    baseOpacity: number;
    baseSize: number;
    orbitRadius: number;
    orbitSpeed: number;
    orbitPhase: number;
    colorType: number; // 0=蓝白, 1=白, 2=黄白, 3=红
}

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

export async function initWebGLBackground() {
    const container = document.getElementById('webgl-container');
    if (!container) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.1,
        100
    );
    camera.position.z = 15;

    const renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // 星空粒子系统
    const starField = createStarField();
    scene.add(starField);

    // 星云粒子
    const nebulaCloud = createNebulaCloud();
    scene.add(nebulaCloud);

    // 中心光晕
    const glowSphere = createCentralGlow();
    scene.add(glowSphere);

    // 鼠标交互 - 微妙的视差效果
    let mouseX = 0, mouseY = 0;
    let targetMouseX = 0, targetMouseY = 0;

    window.addEventListener('mousemove', (e) => {
        targetMouseX = (e.clientX / window.innerWidth - 0.5) * 2;
        targetMouseY = (e.clientY / window.innerHeight - 0.5) * 2;
    });

    // 动画循环
    function animate() {
        requestAnimationFrame(animate);

        const time = Date.now() * 0.001;

        // 平滑鼠标跟随
        mouseX += (targetMouseX - mouseX) * 0.02;
        mouseY += (targetMouseY - mouseY) * 0.02;

        // 缓慢旋转整个星空
        starField.rotation.y += 0.00015;
        starField.rotation.x += 0.00008;
        // 鼠标微调视差
        starField.rotation.y += mouseX * 0.0003;
        starField.rotation.x += mouseY * 0.0002;

        // 星云缓慢旋转
        nebulaCloud.rotation.y += 0.0001;
        nebulaCloud.rotation.z += 0.00005;

        // 更新星星闪烁
        updateStarTwinkle(starField, time);

        // 中心光晕脉冲
        const pulse = 1 + Math.sin(time * 0.5) * 0.15;
        glowSphere.scale.setScalar(pulse);
        (glowSphere.material as THREE.MeshBasicMaterial).opacity = 0.12 + Math.sin(time * 0.7) * 0.05;

        renderer.render(scene, camera);
    }

    // 窗口大小调整
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    animate();
}

/**
 * 创建多层次星空粒子系统
 */
function createStarField(): THREE.Group {
    const starGroup = new THREE.Group();

    // 三层星空：近景、中景、远景，营造深度感
    createStarLayer(starGroup, 80, 0.025, 0.035, 4, 6, 0.4, 0.8);   // 近景亮星
    createStarLayer(starGroup, 200, 0.012, 0.02, 6, 9, 0.25, 0.55);  // 中景
    createStarLayer(starGroup, 400, 0.006, 0.012, 8, 14, 0.12, 0.3); // 远景暗星
    createStarLayer(starGroup, 120, 0.003, 0.005, 10, 18, 0.05, 0.15); // 极远星尘

    return starGroup;
}

/**
 * 创建单层星星
 */
function createStarLayer(
    group: THREE.Group,
    count: number,
    minSize: number,
    maxSize: number,
    minDist: number,
    maxDist: number,
    minOpacity: number,
    maxOpacity: number,
) {
    for (let i = 0; i < count; i++) {
        const size = minSize + Math.random() * (maxSize - minSize);
        const geometry = new THREE.SphereGeometry(size, 6, 6);

        const colorType = Math.floor(Math.random() * STAR_COLORS.length);
        const color = STAR_COLORS[colorType];

        const material = new THREE.MeshBasicMaterial({
            color,
            transparent: true,
            opacity: minOpacity + Math.random() * (maxOpacity - minOpacity),
            depthWrite: false,
        });

        const star = new THREE.Mesh(geometry, material);

        // 球面均匀分布
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const radius = minDist + Math.random() * (maxDist - minDist);

        star.position.set(
            radius * Math.sin(phi) * Math.cos(theta),
            radius * Math.sin(phi) * Math.sin(theta),
            radius * Math.cos(phi),
        );

        // 存储闪烁参数
        star.userData = {
            twinkleSpeed: 0.5 + Math.random() * 2.5,
            twinkleOffset: Math.random() * Math.PI * 2,
            baseOpacity: material.opacity,
            baseSize: size,
            orbitRadius: radius,
            orbitSpeed: 0.02 + Math.random() * 0.08,
            orbitPhase: Math.random() * Math.PI * 2,
            colorType,
        } as StarData;

        group.add(star);
    }
}

/**
 * 更新星星闪烁效果 - 使用正弦波叠加产生自然闪烁
 */
function updateStarTwinkle(starGroup: THREE.Group, time: number) {
    starGroup.children.forEach((child) => {
        const star = child as THREE.Mesh;
        const data = star.userData as StarData;
        if (!data) return;

        const material = star.material as THREE.MeshBasicMaterial;

        // 多层正弦波叠加产生自然的亮度变化
        const twinkle1 = Math.sin(time * data.twinkleSpeed + data.twinkleOffset);
        const twinkle2 = Math.sin(time * data.twinkleSpeed * 1.7 + data.twinkleOffset + 1.3);
        const twinkle3 = Math.sin(time * data.twinkleSpeed * 0.3 + data.twinkleOffset + 2.7);
        const twinkle = (twinkle1 * 0.5 + twinkle2 * 0.3 + twinkle3 * 0.2 + 1) / 2; // 0~1 范围

        // 映射到合理的不透明度范围
        const minOp = data.baseOpacity * 0.4;
        const maxOp = data.baseOpacity * 1.2;
        material.opacity = minOp + twinkle * (maxOp - minOp);
    });
}

/**
 * 创建星云粒子云
 */
function createNebulaCloud(): THREE.Group {
    const nebulaGroup = new THREE.Group();
    const count = 60;

    for (let i = 0; i < count; i++) {
        const size = 0.3 + Math.random() * 1.2;
        const geometry = new THREE.SphereGeometry(size, 8, 8);
        const color = NEBULA_COLORS[Math.floor(Math.random() * NEBULA_COLORS.length)];

        const material = new THREE.MeshBasicMaterial({
            color,
            transparent: true,
            opacity: 0.04 + Math.random() * 0.08,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
        });

        const nebula = new THREE.Mesh(geometry, material);

        // 集中在某些区域形成星云团
        const clusterAngle = Math.random() * Math.PI * 2;
        const clusterRadius = 2 + Math.random() * 8;
        const spread = (Math.random() - 0.5) * 6;

        nebula.position.set(
            Math.cos(clusterAngle) * clusterRadius + spread,
            Math.sin(clusterAngle) * clusterRadius + spread * 0.7,
            (Math.random() - 0.5) * 10,
        );

        nebula.userData = {
            basePos: nebula.position.clone(),
            driftSpeed: 0.1 + Math.random() * 0.3,
            driftAmp: 0.2 + Math.random() * 0.6,
            phase: Math.random() * Math.PI * 2,
        };

        nebulaGroup.add(nebula);
    }

    return nebulaGroup;
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