import React from 'react';
import styles from './CienGrid.module.css';
import { Word } from '@/data/cien-data';

interface CienGridProps {
    words: Word[];
    masteredIds: string[];
    unlockedIds: string[];
}

export const CienGrid: React.FC<CienGridProps> = ({ words, masteredIds, unlockedIds }) => {
    // Ensure we have exactly 100 cells, even if words array is partial
    const cells = Array.from({ length: 100 }, (_, i) => {
        const word = words.find(w => w.rank === i + 1);
        return word;
    });

    return (
        <div className={styles.gridContainer}>
            {cells.map((word, index) => {
                const isMastered = word && masteredIds.includes(word.id);
                const isUnlocked = word && unlockedIds.includes(word.id);
                const statusClass = isMastered ? styles.mastered : isUnlocked ? styles.unlocked : styles.locked;

                return (
                    <div key={index} className={`${styles.cell} ${statusClass}`}>
                        {word && (
                            <div className={styles.tooltip}>
                                {word.spanish}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};
