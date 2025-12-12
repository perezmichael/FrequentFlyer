'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';
import { FlashCard } from '@/components/cien/FlashCard';
import { initialPhrases, words } from '@/data/cien-data';
import { CienProvider, useCien } from '@/context/CienContext';

function SessionContent() {
    const router = useRouter();
    const { recordPractice, unlockNextBatch, unlockedIds, practiceHistory } = useCien();
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const [isComplete, setIsComplete] = useState(false);

    // Filter phrases to only show those that contain at least one unlocked word
    // This is a simple heuristic for now.
    const sessionPhrases = React.useMemo(() => {
        return initialPhrases.filter(phrase =>
            phrase.wordIds.some(id => unlockedIds.includes(id))
        );
    }, [unlockedIds]);

    const progress = ((currentIndex) / sessionPhrases.length) * 100;

    const handleGrade = (rating: 'hard' | 'good' | 'easy') => {
        const currentPhrase = sessionPhrases[currentIndex];
        recordPractice(currentPhrase.id, rating);

        if (currentIndex < sessionPhrases.length - 1) {
            setIsFlipped(false);
            setTimeout(() => setCurrentIndex(prev => prev + 1), 300); // Wait for flip back
        } else {
            setIsComplete(true);
            // Simple progression logic: if session complete, unlock more
            unlockNextBatch();
        }
    };

    const handleFlip = () => {
        setIsFlipped(!isFlipped);
    };

    if (sessionPhrases.length === 0) {
        return (
            <div className={styles.container}>
                <div className={styles.completeContainer}>
                    <h2 className={styles.completeTitle}>Loading Session...</h2>
                </div>
            </div>
        )
    }

    if (isComplete) {
        return (
            <div className={styles.container}>
                <div className={styles.completeContainer}>
                    <h2 className={styles.completeTitle}>Session Complete</h2>
                    <p className={styles.completeText}>You've practiced {sessionPhrases.length} phrases today.</p>
                    <Link href="/prototypes/cien">
                        <button className={`${styles.controlButton} ${styles.primary}`}>
                            Back to Grid
                        </button>
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <Link href="/prototypes/cien">
                    <button className={styles.closeButton}>&times;</button>
                </Link>
                <div className={styles.progressContainer}>
                    <div className={styles.progressBar} style={{ width: `${progress}%` }} />
                </div>
                <div style={{ width: 40 }} /> {/* Spacer for balance */}
            </header>

            <div className={styles.cardArea}>
                <FlashCard
                    key={currentIndex} // Force re-render on change for animation
                    phrase={sessionPhrases[currentIndex]}
                    words={words}
                    onFlip={handleFlip}
                />
            </div>

            <div className={`${styles.controls} ${isFlipped ? styles.visible : ''}`}>
                <button className={styles.controlButton} onClick={() => handleGrade('hard')}>
                    Hard
                </button>
                <button className={`${styles.controlButton} ${styles.primary}`} onClick={() => handleGrade('good')}>
                    Good
                </button>
                <button className={styles.controlButton} onClick={() => handleGrade('easy')}>
                    Easy
                </button>
            </div>
        </div>
    );
}

export default function SessionPage() {
    return (
        <CienProvider>
            <SessionContent />
        </CienProvider>
    );
}
