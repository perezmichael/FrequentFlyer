'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';
import { Place, INITIAL_PLACES } from '@/features/mx-guide/data/mx-places';
import PlaceList from '@/features/mx-guide/components/PlaceList';
import AddPlaceForm from '@/features/mx-guide/components/AddPlaceForm';
import Letter3DSwap from '@/components/fancy/text/letter-3d-swap';
import styles from '@/features/mx-guide/components/MxGuide.module.css';

// Dynamically import map with no SSR
const GuideMap = dynamic(() => import('@/features/mx-guide/components/GuideMap'), {
    ssr: false,
    loading: () => (
        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F5F5F5', color: '#737373' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <div className={styles.spinner}></div>
                <span style={{ fontSize: '14px', fontWeight: 500 }}>Loading Map...</span>
            </div>
        </div>
    )
});

export default function MexicoCityGuide() {
    const [places, setPlaces] = useState<Place[]>(INITIAL_PLACES);
    const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
    const [isAddingPlace, setIsAddingPlace] = useState(false);
    const [filter, setFilter] = useState<string>('all');

    // Derived categories
    const categories = ['all', ...Array.from(new Set(places.map(p => p.category)))];

    const filteredPlaces = filter === 'all'
        ? places
        : places.filter(p => p.category === filter);

    const handleAddPlace = (newPlaceData: Omit<Place, 'id'>) => {
        const newPlace: Place = {
            ...newPlaceData,
            id: generateId(),
        };
        setPlaces([...places, newPlace]);
        setIsAddingPlace(false);
        setSelectedPlaceId(newPlace.id);
    };

    const generateId = () => {
        return Math.random().toString(36).substr(2, 9);
    };

    return (
        <div className={styles.container}>
            {/* Sidebar / List - Removed wrapper div here since PlaceList now has sidebar class */}
            {isAddingPlace ? (
                <div className={styles.sidebar}> {/* Reusing sidebar style for form container wrapper */}
                    <div className={styles.formContainer}>
                        <h2 className={styles.formTitle}>New Place</h2>
                        <AddPlaceForm
                            onAdd={handleAddPlace}
                            onCancel={() => setIsAddingPlace(false)}
                        />
                    </div>
                </div>
            ) : (
                <PlaceList
                    places={filteredPlaces}
                    selectedPlaceId={selectedPlaceId}
                    onSelect={setSelectedPlaceId}
                    onAddClick={() => setIsAddingPlace(true)}
                />
            )}

            {/* Map Area */}
            <div className={styles.mapArea}>
                <div className={styles.floatingHeader}>
                    <span className={styles.headerTitle}>
                        <Letter3DSwap rotateDirection="top">Ciudad de México</Letter3DSwap>
                    </span>
                    <div className={styles.filterBarFloating}>
                        {categories.map(cat => (
                            <div
                                key={cat}
                                className={`${styles.filterChip} ${styles[`chip-${cat}`]} ${filter === cat ? styles.active : ''}`}
                                onClick={() => setFilter(cat)}
                            >
                                {cat === 'all' ? 'All' : cat.charAt(0).toUpperCase() + cat.slice(1)}
                            </div>
                        ))}
                    </div>
                </div>
                <GuideMap
                    places={filteredPlaces}
                    selectedPlaceId={selectedPlaceId}
                    onPlaceClick={setSelectedPlaceId}
                />
            </div>
        </div>
    );
}
