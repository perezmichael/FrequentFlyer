'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { words } from '@/data/cien-data';

interface PracticeRecord {
    phraseId: string;
    timestamp: number;
    rating: 'hard' | 'good' | 'easy';
}

interface CienState {
    masteredIds: string[];
    unlockedIds: string[];
    practiceHistory: PracticeRecord[];
}

interface CienContextType extends CienState {
    markMastered: (wordId: string) => void;
    unlockNextBatch: () => void;
    recordPractice: (phraseId: string, rating: 'hard' | 'good' | 'easy') => void;
    resetProgress: () => void;
}

const CienContext = createContext<CienContextType | undefined>(undefined);

const STORAGE_KEY = 'cien_progress_v1';

export function CienProvider({ children }: { children: React.ReactNode }) {
    const [state, setState] = useState<CienState>({
        masteredIds: [],
        unlockedIds: [],
        practiceHistory: [],
    });

    const [isLoaded, setIsLoaded] = useState(false);

    // Load from local storage on mount
    useEffect(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            try {
                setState(JSON.parse(saved));
            } catch (e) {
                console.error('Failed to load Cien progress', e);
            }
        } else {
            // Initialize with first 10 words unlocked
            const initialUnlocked = words.slice(0, 10).map(w => w.id);
            setState(prev => ({ ...prev, unlockedIds: initialUnlocked }));
        }
        setIsLoaded(true);
    }, []);

    // Save to local storage on change
    useEffect(() => {
        if (isLoaded) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        }
    }, [state, isLoaded]);

    const markMastered = (wordId: string) => {
        setState(prev => {
            if (prev.masteredIds.includes(wordId)) return prev;
            return { ...prev, masteredIds: [...prev.masteredIds, wordId] };
        });
    };

    const unlockNextBatch = () => {
        setState(prev => {
            const currentCount = prev.unlockedIds.length;
            const nextBatch = words.slice(currentCount, currentCount + 5).map(w => w.id);
            return { ...prev, unlockedIds: [...prev.unlockedIds, ...nextBatch] };
        });
    };

    const recordPractice = (phraseId: string, rating: 'hard' | 'good' | 'easy') => {
        setState(prev => ({
            ...prev,
            practiceHistory: [
                ...prev.practiceHistory,
                { phraseId, timestamp: Date.now(), rating }
            ]
        }));
    };

    const resetProgress = () => {
        const initialUnlocked = words.slice(0, 10).map(w => w.id);
        setState({
            masteredIds: [],
            unlockedIds: initialUnlocked,
            practiceHistory: [],
        });
    };

    return (
        <CienContext.Provider value={{ ...state, markMastered, unlockNextBatch, recordPractice, resetProgress }}>
            {children}
        </CienContext.Provider>
    );
}

export function useCien() {
    const context = useContext(CienContext);
    if (context === undefined) {
        throw new Error('useCien must be used within a CienProvider');
    }
    return context;
}
