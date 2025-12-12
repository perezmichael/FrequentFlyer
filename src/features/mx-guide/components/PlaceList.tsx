'use client';

import { useState } from 'react';
import { Place } from '@/features/mx-guide/data/mx-places';
import styles from './MxGuide.module.css';

interface PlaceListProps {
    places: Place[];
    selectedPlaceId: string | null;
    onSelect: (id: string) => void;
    onAddClick: () => void;
}

export default function PlaceList({ places, selectedPlaceId, onSelect, onAddClick }: PlaceListProps) {
    // List now receives already filtered places or just lists them

    return (
        <div className={styles.sidebar}>
            <div className={styles.listHeader}>
                {/* Title removed, moved to floating map header */}
                <button
                    onClick={onAddClick}
                    className={styles.addButton}
                    title="Add Place"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
                        <path fillRule="evenodd" d="M12 3.75a.75.75 0 01.75.75v6.75h6.75a.75.75 0 010 1.5h-6.75v6.75a.75.75 0 01-1.5 0v-6.75H4.5a.75.75 0 010-1.5h6.75V4.5a.75.75 0 01.75-.75z" clipRule="evenodd" />
                    </svg>
                </button>
            </div>

            <div className={styles.listContent}>
                {places.map((place) => (
                    <div
                        key={place.id}
                        onClick={() => onSelect(place.id)}
                        className={`${styles.placeItem} ${selectedPlaceId === place.id ? styles.selected : ''}`}
                    >
                        <div className={styles.placeImage}>
                            <img
                                src={place.image}
                                alt={place.name}
                            />
                        </div>
                        <div className={styles.placeDetails}>
                            <h3 className={styles.placeName}>
                                {place.name}
                            </h3>
                            <span className={`${styles.placeCategory} ${styles[`cat-${place.category}`]}`}>
                                {place.category}
                            </span>
                            <p className={styles.placeDesc}>
                                {place.description}
                            </p>
                        </div>
                    </div>
                ))}
            </div>

            <div className={styles.footer}>
                <p>Designed by Antigravity</p>
            </div>
        </div>
    );
}
