'use client';

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

interface AuraVisualizerProps {
    colors: string[];
    speed: number;
    intensity?: number;
}

export default function AuraVisualizer({ colors, speed, intensity = 1 }: AuraVisualizerProps) {
    // Ensure we always have at least 3 colors for the blobs
    const safeColors = [...colors, ...colors, ...colors].slice(0, 3);

    return (
        <div className="relative w-full h-full overflow-hidden bg-black/5 rounded-3xl backdrop-blur-3xl">
            {/* Base Glow */}
            <div
                className="absolute inset-0 opacity-30 transition-colors duration-1000"
                style={{ background: `linear-gradient(to bottom right, ${safeColors[0]}, ${safeColors[1]})` }}
            />

            {/* Blob 1 */}
            <motion.div
                className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full mix-blend-screen filter blur-3xl opacity-60"
                style={{ backgroundColor: safeColors[0] }}
                animate={{
                    x: [0, 100, -50, 0],
                    y: [0, -50, 100, 0],
                    scale: [1, 1.2, 0.9, 1],
                }}
                transition={{
                    duration: 10 / speed,
                    repeat: Infinity,
                    ease: "easeInOut"
                }}
            />

            {/* Blob 2 */}
            <motion.div
                className="absolute top-1/3 right-1/4 w-72 h-72 rounded-full mix-blend-screen filter blur-3xl opacity-60"
                style={{ backgroundColor: safeColors[1] }}
                animate={{
                    x: [0, -70, 60, 0],
                    y: [0, 80, -40, 0],
                    scale: [1, 1.1, 0.8, 1],
                }}
                transition={{
                    duration: 12 / speed,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 1
                }}
            />

            {/* Blob 3 */}
            <motion.div
                className="absolute bottom-1/4 left-1/3 w-80 h-80 rounded-full mix-blend-screen filter blur-3xl opacity-60"
                style={{ backgroundColor: safeColors[2] }}
                animate={{
                    x: [0, 50, -80, 0],
                    y: [0, -60, 50, 0],
                    scale: [1, 1.3, 0.9, 1],
                }}
                transition={{
                    duration: 15 / speed,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 2
                }}
            />

            {/* Overlay Texture/Noise (Optional) */}
            <div className="absolute inset-0 opacity-20 pointer-events-none mix-blend-overlay"
                style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22 opacity=%221%22/%3E%3C/svg%3E")' }}
            />
        </div>
    );
}
