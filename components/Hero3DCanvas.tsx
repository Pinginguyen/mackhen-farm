'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

const PARTICLE_COLORS = [0x8b1e1e, 0xc89b68, 0x2d5a27];
const PARTICLES_PER_COLOR = 44;

type Particle = {
  x: number;
  y: number;
  z: number;
  size: number;
  phase: number;
};

export default function Hero3DCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const deviceMemory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
    const lowPowerDevice = window.matchMedia('(max-width: 768px)').matches
      || (navigator.hardwareConcurrency > 0 && navigator.hardwareConcurrency <= 4)
      || (deviceMemory !== undefined && deviceMemory <= 4);
    const particleCount = lowPowerDevice ? 24 : PARTICLES_PER_COLOR;
    const frameInterval = 1000 / (lowPowerDevice ? 24 : 30);

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: false,
        powerPreference: 'low-power',
      });
    } catch {
      return;
    }

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 40);
    camera.position.z = 7;
    const field = new THREE.Group();
    scene.add(field);

    const geometry = new THREE.SphereGeometry(0.045, lowPowerDevice ? 6 : 8, lowPowerDevice ? 4 : 6);
    const groups = PARTICLE_COLORS.map((color) => {
      const material = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.52,
        depthWrite: false,
      });
      const mesh = new THREE.InstancedMesh(geometry, material, particleCount);
      mesh.frustumCulled = false;
      field.add(mesh);
      return { mesh, particles: [] as Particle[] };
    });

    const transform = new THREE.Object3D();
    let targetX = 0;
    let targetY = 0;
    let frameId = 0;
    let frameTimer = 0;
    let lastFrame = 0;
    let elapsed = 0;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let isInView = false;
    let isPageVisible = document.visibilityState === 'visible';

    function updateInstances(mesh: THREE.InstancedMesh, particles: Particle[], time: number) {
      particles.forEach((particle, index) => {
        transform.position.set(
          particle.x,
          particle.y + (reducedMotion ? 0 : Math.sin(time * 0.45 + particle.phase) * 0.045),
          particle.z,
        );
        transform.scale.setScalar(particle.size);
        transform.updateMatrix();
        mesh.setMatrixAt(index, transform.matrix);
      });
      mesh.instanceMatrix.needsUpdate = true;
    }

    function resize() {
      const width = canvasRef.current?.clientWidth ?? 0;
      const height = canvasRef.current?.clientHeight ?? 0;
      if (!width || !height) return;

      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, lowPowerDevice ? 1 : 1.25));
      renderer.setSize(width, height, false);
      const halfWidth = Math.max(2.4, Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z * camera.aspect);

      groups.forEach(({ mesh, particles }) => {
        particles.length = 0;
        for (let index = 0; index < particleCount; index += 1) {
          particles.push({
            x: THREE.MathUtils.randFloatSpread(halfWidth * 1.8),
            y: THREE.MathUtils.randFloatSpread(3.8),
            z: THREE.MathUtils.randFloatSpread(1.8),
            size: THREE.MathUtils.randFloat(0.65, 1.45),
            phase: Math.random() * Math.PI * 2,
          });
        }
        updateInstances(mesh, particles, elapsed);
      });
      renderer.render(scene, camera);
    }

    function animate(now: number) {
      frameId = 0;
      if (reducedMotion || !isInView || !isPageVisible) return;
      if (lastFrame && now - lastFrame < frameInterval) {
        frameTimer = window.setTimeout(() => {
          frameTimer = 0;
          if (isInView && isPageVisible) frameId = window.requestAnimationFrame(animate);
        }, frameInterval - (now - lastFrame));
        return;
      }

      const delta = lastFrame ? Math.min((now - lastFrame) / 1000, 0.05) : 0;
      lastFrame = now;
      elapsed += delta;
      field.rotation.x += (targetY * 0.075 - field.rotation.x) * 0.035;
      field.rotation.y += (targetX * 0.11 - field.rotation.y) * 0.035;
      groups.forEach(({ mesh, particles }) => updateInstances(mesh, particles, elapsed));
      renderer.render(scene, camera);
      frameTimer = window.setTimeout(() => {
        frameTimer = 0;
        if (isInView && isPageVisible) frameId = window.requestAnimationFrame(animate);
      }, frameInterval);
    }

    function handlePointerMove(event: PointerEvent) {
      if (event.pointerType !== 'mouse') return;
      targetX = (event.clientX / window.innerWidth) * 2 - 1;
      targetY = (event.clientY / window.innerHeight) * 2 - 1;
    }

    function stopAnimation() {
      window.cancelAnimationFrame(frameId);
      window.clearTimeout(frameTimer);
      frameId = 0;
      frameTimer = 0;
      lastFrame = 0;
    }

    function syncAnimation() {
      if (reducedMotion || !isInView || !isPageVisible) {
        stopAnimation();
        return;
      }
      if (!frameId && !frameTimer) frameId = window.requestAnimationFrame(animate);
    }

    function handleVisibilityChange() {
      isPageVisible = document.visibilityState === 'visible';
      syncAnimation();
    }

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);
    resize();

    const observedElement = canvas.closest('.hero') ?? canvas;
    const intersectionObserver = new IntersectionObserver(([entry]) => {
      isInView = entry.isIntersecting;
      syncAnimation();
    });
    intersectionObserver.observe(observedElement);
    const hero = canvas.closest<HTMLElement>('.hero');
    hero?.addEventListener('pointermove', handlePointerMove, { passive: true });
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      stopAnimation();
      hero?.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      groups.forEach(({ mesh }) => {
        mesh.material.dispose();
        field.remove(mesh);
      });
      geometry.dispose();
      renderer.dispose();
    };
  }, []);

  return <canvas ref={canvasRef} className="hero3d-canvas" aria-hidden="true" />;
}