'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import gsap from 'gsap';

interface ParticleSceneProps {
    currentShape: 'sphere' | 'cube' | 'random' | 'helix';
}

export default function ParticleScene({ currentShape }: ParticleSceneProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const sceneRef = useRef<THREE.Scene | null>(null);
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const particlesRef = useRef<THREE.Points | null>(null);
    const geometryRef = useRef<THREE.BufferGeometry | null>(null);

    // Store positions for different shapes
    const positionsRef = useRef<{ [key: string]: Float32Array }>({});

    useEffect(() => {
        if (!containerRef.current) return;

        // --- Setup ---
        const scene = new THREE.Scene();
        sceneRef.current = scene;

        const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.z = 30;
        cameraRef.current = camera;

        const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        containerRef.current.appendChild(renderer.domElement);
        rendererRef.current = renderer;

        // --- Particles ---
        const particleCount = 8000;
        const geometry = new THREE.BufferGeometry();
        geometryRef.current = geometry;

        // Generate positions for different shapes
        const randomPositions = new Float32Array(particleCount * 3);
        const spherePositions = new Float32Array(particleCount * 3);
        const cubePositions = new Float32Array(particleCount * 3);
        const helixPositions = new Float32Array(particleCount * 3);

        for (let i = 0; i < particleCount; i++) {
            // Random Cloud
            randomPositions[i * 3] = (Math.random() - 0.5) * 50;
            randomPositions[i * 3 + 1] = (Math.random() - 0.5) * 50;
            randomPositions[i * 3 + 2] = (Math.random() - 0.5) * 50;

            // Sphere
            const phi = Math.acos(-1 + (2 * i) / particleCount);
            const theta = Math.sqrt(particleCount * Math.PI) * phi;
            const r = 12;
            spherePositions[i * 3] = r * Math.cos(theta) * Math.sin(phi);
            spherePositions[i * 3 + 1] = r * Math.sin(theta) * Math.sin(phi);
            spherePositions[i * 3 + 2] = r * Math.cos(phi);

            // Cube
            const cubeSize = 18;
            cubePositions[i * 3] = (Math.random() - 0.5) * cubeSize;
            cubePositions[i * 3 + 1] = (Math.random() - 0.5) * cubeSize;
            cubePositions[i * 3 + 2] = (Math.random() - 0.5) * cubeSize;

            // Helix
            const t = i / particleCount * 20; // Loops
            const helixR = 8;
            helixPositions[i * 3] = helixR * Math.cos(t * Math.PI * 2);
            helixPositions[i * 3 + 1] = (i / particleCount - 0.5) * 30; // Height
            helixPositions[i * 3 + 2] = helixR * Math.sin(t * Math.PI * 2);
        }

        positionsRef.current = {
            random: randomPositions,
            sphere: spherePositions,
            cube: cubePositions,
            helix: helixPositions
        };

        // Initialize with random positions
        geometry.setAttribute('position', new THREE.BufferAttribute(randomPositions.slice(), 3));

        // Material
        const material = new THREE.PointsMaterial({
            color: 0x88ccff,
            size: 0.15,
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending,
        });

        const particles = new THREE.Points(geometry, material);
        scene.add(particles);
        particlesRef.current = particles;

        // --- Animation Loop ---
        let animationId: number;
        const animate = () => {
            animationId = requestAnimationFrame(animate);

            if (particles) {
                particles.rotation.y += 0.001;
                particles.rotation.x += 0.0005;
            }

            renderer.render(scene, camera);
        };
        animate();

        // --- Resize Handler ---
        const handleResize = () => {
            if (!cameraRef.current || !rendererRef.current) return;
            cameraRef.current.aspect = window.innerWidth / window.innerHeight;
            cameraRef.current.updateProjectionMatrix();
            rendererRef.current.setSize(window.innerWidth, window.innerHeight);
        };
        window.addEventListener('resize', handleResize);

        // --- Cleanup ---
        return () => {
            cancelAnimationFrame(animationId);
            window.removeEventListener('resize', handleResize);
            if (containerRef.current && renderer.domElement) {
                containerRef.current.removeChild(renderer.domElement);
            }
            geometry.dispose();
            material.dispose();
            renderer.dispose();
        };
    }, []);

    // --- Morphing Logic ---
    useEffect(() => {
        if (!geometryRef.current || !positionsRef.current[currentShape]) return;

        const currentPositions = geometryRef.current.attributes.position.array as Float32Array;
        const targetPositions = positionsRef.current[currentShape];

        const tweenObj = { t: 0 };
        const startPositions = Float32Array.from(currentPositions);

        gsap.to(tweenObj, {
            t: 1,
            duration: 1.5,
            ease: "power2.inOut",
            onUpdate: () => {
                for (let i = 0; i < currentPositions.length; i++) {
                    currentPositions[i] = startPositions[i] + (targetPositions[i] - startPositions[i]) * tweenObj.t;
                }
                geometryRef.current!.attributes.position.needsUpdate = true;
            }
        });

        // Optional: Tween color based on shape
        if (particlesRef.current) {
            const material = particlesRef.current.material as THREE.PointsMaterial;
            const targetColor = new THREE.Color();

            if (currentShape === 'sphere') targetColor.set(0xff88cc); // Pinkish
            else if (currentShape === 'cube') targetColor.set(0x88ffcc); // Tealish
            else if (currentShape === 'helix') targetColor.set(0xffcc88); // Orangeish
            else targetColor.set(0x88ccff); // Blueish

            gsap.to(material.color, {
                r: targetColor.r,
                g: targetColor.g,
                b: targetColor.b,
                duration: 1.5
            });
        }

    }, [currentShape]);

    return (
        <div
            ref={containerRef}
            className="absolute inset-0"
            style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                zIndex: 0 // Changed from -10 to 0 to sit inside the container but behind overlay (which is z-10)
            }}
        />
    );
}
