'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from './page.module.css';
import { CienGrid } from '@/components/cien/CienGrid';
import { words } from '@/data/cien-data';
import { CienProvider, useCien } from '@/context/CienContext';

function CienDashboard() {
    const { masteredIds, unlockedIds } = useCien();

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <h1 className={styles.title}>Cien</h1>
                <p className={styles.subtitle}>Speak Spanish with 100 words.</p>
            </header>

            <div className={styles.gridSection}>
                <CienGrid
                    words={words}
                    masteredIds={masteredIds}
                    unlockedIds={unlockedIds}
                />
                <div className={styles.stats}>
                    <div className={styles.statItem}>
                        <strong>{masteredIds.length}</strong> Mastered
                    </div>
                    <div className={styles.statItem}>
                        <strong>{unlockedIds.length}</strong> Unlocked
                    </div>
                </div>
            </div>

            <Link href="/prototypes/cien/session">
                <button className={styles.actionButton}>
                    Start Today's Session
                </button>
            </Link>
        </div>
    );
}

export default function CienPage() {
    return (
        <CienProvider>
            <CienDashboard />
        </CienProvider>
    );
}
