// src/scripts/animation-system/three-animations.ts
import * as THREE from 'three';

export async function initWebGLBackground() {
    const container = document.getElementById('webgl-container');
    if (!container) return;

    // 创建场景
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
    );
    
    const renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true
    });
    
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // 创建粒子系统
    const particles = createParticleSystem();
    scene.add(particles);

    // 灯光
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    
    const pointLight = new THREE.PointLight(0x4a9eff, 1);
    pointLight.position.set(5, 5, 5);
    scene.add(pointLight);

    camera.position.z = 5;

    // 动画循环
    function animate() {
        requestAnimationFrame(animate);
        
        // 非线性粒子动画
        const time = Date.now() * 0.001;
        particles.rotation.x = time * 0.05;
        particles.rotation.y = time * 0.03;
        
        // 使用噪声函数创建非线性运动
        particles.children.forEach((particle: THREE.Object3D, i) => {
            const angle = (i / particles.children.length) * Math.PI * 2;
            const radius = 3 + Math.sin(time + i) * 0.5;
            
            particle.position.x = Math.cos(angle + time) * radius;
            particle.position.y = Math.sin(angle + time * 1.3) * radius;
            particle.position.z = Math.cos(time * 0.7 + i) * 2;
        });

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

function createParticleSystem() {
    const particlesCount = 500;
    const particles = new THREE.Group();
    
    const geometry = new THREE.SphereGeometry(0.05, 8, 8);
    const material = new THREE.MeshBasicMaterial({
        color: 0x4a9eff,
        transparent: true,
        opacity: 0.6
    });

    for (let i = 0; i < particlesCount; i++) {
        const particle = new THREE.Mesh(geometry, material);
        
        // 非线性分布
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos((Math.random() * 2) - 1);
        const radius = 2 + Math.random() * 3;
        
        particle.position.x = radius * Math.sin(phi) * Math.cos(theta);
        particle.position.y = radius * Math.sin(phi) * Math.sin(theta);
        particle.position.z = radius * Math.cos(phi);
        
        particle.userData.originalPosition = particle.position.clone();
        particles.add(particle);
    }

    return particles;
}