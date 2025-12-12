'use client';

import { useState } from 'react';
import { Place } from '@/features/mx-guide/data/mx-places';
import styles from './MxGuide.module.css';

interface AddPlaceFormProps {
    onAdd: (place: Omit<Place, 'id'>) => void;
    onCancel: () => void;
}

export default function AddPlaceForm({ onAdd, onCancel }: AddPlaceFormProps) {
    const [formData, setFormData] = useState<Partial<Place>>({
        category: 'other'
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (formData.name && formData.lat && formData.lng) {
            onAdd({
                name: formData.name,
                description: formData.description || '',
                category: formData.category as Place['category'],
                lat: Number(formData.lat),
                lng: Number(formData.lng),
                image: formData.image || 'https://images.unsplash.com/photo-1518105779142-d975f22f1b0a?auto=format&fit=crop&q=80&w=1000'
            });
        }
    };

    return (
        <form onSubmit={handleSubmit} className={styles.form}>
            <h3 className="text-white font-bold">Add New Place</h3>

            <div className={styles.formGroup}>
                <label className={styles.label}>Name</label>
                <input
                    type="text"
                    required
                    className={styles.input}
                    placeholder="e.g. Frida Kahlo Museum"
                    value={formData.name || ''}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                />
            </div>

            <div className={styles.grid2}>
                <div className={styles.formGroup}>
                    <label className={styles.label}>Latitude</label>
                    <input
                        type="number"
                        step="any"
                        required
                        className={styles.input}
                        placeholder="19.xxx"
                        value={formData.lat || ''}
                        onChange={e => setFormData({ ...formData, lat: Number(e.target.value) })}
                    />
                </div>
                <div className={styles.formGroup}>
                    <label className={styles.label}>Longitude</label>
                    <input
                        type="number"
                        step="any"
                        required
                        className={styles.input}
                        placeholder="-99.xxx"
                        value={formData.lng || ''}
                        onChange={e => setFormData({ ...formData, lng: Number(e.target.value) })}
                    />
                </div>
            </div>

            <div className={styles.formGroup}>
                <label className={styles.label}>Category</label>
                <select
                    className={styles.select}
                    value={formData.category}
                    onChange={e => setFormData({ ...formData, category: e.target.value as Place['category'] })}
                >
                    <option value="museum">Museum</option>
                    <option value="restaurant">Restaurant</option>
                    <option value="historical">Historical</option>
                    <option value="coffee">Coffee Shop</option>
                    <option value="park">Park</option>
                    <option value="other">Other</option>
                </select>
            </div>

            <div className={styles.formGroup}>
                <label className={styles.label}>Description</label>
                <textarea
                    className={styles.textarea}
                    placeholder="Brief description..."
                    value={formData.description || ''}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                />
            </div>

            <div className={styles.formGroup}>
                <label className={styles.label}>Image URL (Optional)</label>
                <input
                    type="url"
                    className={styles.input}
                    placeholder="https://..."
                    value={formData.image || ''}
                    onChange={e => setFormData({ ...formData, image: e.target.value })}
                />
            </div>

            <div className={styles.formActions}>
                <button
                    type="button"
                    onClick={onCancel}
                    className={styles.btnCancel}
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    className={styles.btnSubmit}
                >
                    Add Place
                </button>
            </div>
        </form>
    );
}
