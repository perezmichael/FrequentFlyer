'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import AuraVisualizer from '@/components/aura/AuraVisualizer';
import PromptInput from '@/components/PromptInput';
import { analyzeVibe, AuraAnalysis } from '@/lib/aura-analysis';
import styles from './aura.module.css';

export default function AuraPage() {
    const [input, setInput] = useState('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [result, setResult] = useState<AuraAnalysis | null>(null);

    const handleAnalyze = async () => {
        if (!input.trim()) return;

        setIsAnalyzing(true);
        setResult(null);

        // Simulate AI processing delay
        setTimeout(() => {
            const analysis = analyzeVibe(input);
            setResult(analysis);
            setIsAnalyzing(false);
        }, 1500);
    };

    return (
        <main className={styles.main}>

            {/* Background Visualizer */}
            <div className={styles.visualizerContainer}>
                <AuraVisualizer
                    colors={result ? result.colors : ['#E5E5E5', '#F5F5F5', '#FFFFFF']}
                    speed={result ? result.speed : 0.5}
                />
            </div>

            <div className={styles.contentContainer}>

                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={styles.header}
                >
                    <h1 className={styles.title}>
                        Aura
                    </h1>
                    <p className={styles.subtitle}>
                        The Digital Vibe Reader
                    </p>
                </motion.div>

                {/* Input Section */}
                <PromptInput
                    value={input}
                    onChange={setInput}
                    onSubmit={handleAnalyze}
                    placeholder="How are you feeling today?"
                    isLoading={isAnalyzing}
                    buttonText="Read Vibe"
                    loadingText="Reading..."
                    buttonVariant="special-2"
                />

                {/* Results Card */}
                <AnimatePresence mode="wait">
                    {result && !isAnalyzing && (
                        <motion.div
                            key="result"
                            initial={{ opacity: 0, rotateX: -15, y: 40 }}
                            animate={{ opacity: 1, rotateX: 0, y: 0 }}
                            exit={{ opacity: 0, rotateX: 15, y: -40 }}
                            transition={{ type: "spring", stiffness: 100, damping: 20 }}
                            className={styles.cardContainer}
                        >
                            <div className={styles.digitalCard}>
                                {/* Card Background Glow */}
                                <div
                                    className={styles.cardGlow}
                                    style={{ '--glow-color': result.colors[0] } as React.CSSProperties}
                                />

                                <div className={styles.cardContent}>
                                    <div className={styles.sentimentBadge}>
                                        {result.sentiment}
                                    </div>

                                    <h2 className={styles.cardDescription}>
                                        "{result.description}"
                                    </h2>

                                    <div className={styles.colorPalette}>
                                        {result.colors.map((color, i) => (
                                            <motion.div
                                                key={i}
                                                initial={{ scale: 0, opacity: 0 }}
                                                animate={{ scale: 1, opacity: 1 }}
                                                transition={{ delay: 0.3 + (i * 0.1) }}
                                                className={styles.colorSwatch}
                                                style={{ backgroundColor: color }}
                                            />
                                        ))}
                                    </div>

                                    {result.keywords.length > 0 && (
                                        <div className={styles.keywords}>
                                            {result.keywords.map((keyword) => (
                                                <span key={keyword} className={styles.keyword}>#{keyword}</span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </main>
    );
}
