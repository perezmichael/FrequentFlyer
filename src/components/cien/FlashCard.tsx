import React, { useState } from 'react';
import styles from './FlashCard.module.css';
import { Phrase, Word } from '@/data/cien-data';

interface FlashCardProps {
    phrase: Phrase;
    words: Word[]; // To look up word meanings for breakdown
    onFlip?: () => void;
}

export const FlashCard: React.FC<FlashCardProps> = ({ phrase, words, onFlip }) => {
    const [isFlipped, setIsFlipped] = useState(false);

    const handleFlip = () => {
        setIsFlipped(!isFlipped);
        if (onFlip) onFlip();
    };

    const playAudio = (e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent card flip
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(phrase.spanish);
            utterance.lang = 'es-ES'; // Spanish (Spain)
            utterance.rate = 0.9; // Slightly slower
            window.speechSynthesis.speak(utterance);
        }
    };

    const getWordBreakdown = () => {
        return phrase.wordIds.map(id => {
            const word = words.find(w => w.id === id);
            return word ? `${word.spanish} = ${word.english}` : null;
        }).filter(Boolean);
    };

    return (
        <div
            className={`${styles.cardContainer} ${isFlipped ? styles.flipped : ''}`}
            onClick={handleFlip}
        >
            <div className={styles.cardInner}>
                <div className={styles.cardFront}>
                    <div className={styles.spanishText}>{phrase.spanish}</div>
                    <button
                        className={styles.audioButton}
                        onClick={playAudio}
                        title="Listen"
                    >
                        🔊
                    </button>
                    <div className={styles.hint}>Tap to reveal</div>
                </div>
                <div className={styles.cardBack}>
                    <div className={styles.englishText}>{phrase.english}</div>
                    <div className={styles.breakdown}>
                        {getWordBreakdown().map((item, i) => (
                            <span key={i}>{item}</span>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};
