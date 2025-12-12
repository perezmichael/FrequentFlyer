'use client';

import { useState } from 'react';
import ParticleScene from '@/components/particles/ParticleScene';
import { motion } from 'framer-motion';
import styles from './particles.module.css';

type ShapeType = 'random' | 'sphere' | 'cube' | 'helix';

export default function ParticlesPage() {
    const [shape, setShape] = useState<ShapeType>('random');

    const shapes: { id: ShapeType; label: string }[] = [
        { id: 'random', label: 'Cloud' },
        { id: 'sphere', label: 'Sphere' },
        { id: 'cube', label: 'Cube' },
        { id: 'helix', label: 'Helix' },
    ];

    return (
        <main className={styles.main}>

            {/* 3D Scene Background */}
            <ParticleScene currentShape={shape} />

            {/* UI Overlay */}
            <div className={styles.overlay}>
                <div className={styles.content}>
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8 }}
                    >
                        <h1 className={styles.title}>
                            Morphing Matter
                        </h1>
                        <p className={styles.description}>
                            A 3D particle system that transitions smoothly between geometric forms.
                        </p>
                    </motion.div>

                    <motion.div
                        className={styles.buttonContainer}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5, duration: 0.8 }}
                    >
                        {shapes.map((s) => (
                            <button
                                key={s.id}
                                onClick={() => setShape(s.id)}
                                className={`${styles.button} ${shape === s.id ? styles.buttonActive : ''}`}
                            >
                                {s.label}
                            </button>
                        ))}
                    </motion.div>
                </div>
            </div>

            {/* Footer/Credits */}
            <div className={styles.footer}>
                Powered by Three.js & GSAP
            </div>
        </main>
    );
}
