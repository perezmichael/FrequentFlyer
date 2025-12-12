'use client';

import { OnboardingData } from '../OnboardingWizard';
import styles from './StepProfile.module.css';

interface StepProps {
    data: OnboardingData;
    updateData: (data: Partial<OnboardingData>) => void;
}

export default function StepProfile({ data, updateData }: StepProps) {
    return (
        <div className={styles.container}>
            <div>
                <h2 className={styles.title}>Profile Info</h2>
                <p className={styles.subtitle}>Add the details that will appear on your digital business card.</p>
            </div>

            <div className={styles.formGroup}>
                <label className={styles.label}>Short Bio</label>
                <textarea
                    className={styles.textarea}
                    placeholder="e.g. Journeyman electrician with 8+ years experience in industrial and data center projects. Detail-oriented and safety focused."
                    value={data.bio || ''}
                    onChange={(e) => updateData({ bio: e.target.value })}
                />
            </div>

            <div className={styles.formGroup}>
                <label className={styles.label}>Profile Photo URL (Optional)</label>
                <input
                    type="text"
                    className={styles.input}
                    placeholder="https://..."
                    value={data.avatar || ''}
                    onChange={(e) => updateData({ avatar: e.target.value })}
                />
            </div>

            <div className={styles.formGroup}>
                <label className={styles.label}>Phone Number</label>
                <input
                    type="tel"
                    className={styles.input}
                    placeholder="(555) 555-5555"
                    value={data.phone || ''}
                    onChange={(e) => updateData({ phone: e.target.value })}
                />
            </div>

            <div className={styles.formGroup}>
                <label className={styles.label}>Email Address</label>
                <input
                    type="email"
                    className={styles.input}
                    placeholder="you@example.com"
                    value={data.email || ''}
                    onChange={(e) => updateData({ email: e.target.value })}
                />
            </div>

            <div className={styles.formGroup}>
                <label className={styles.label}>Availability</label>
                <select
                    className={styles.select}
                    value={data.availability || 'Available Now'}
                    onChange={(e) => updateData({ availability: e.target.value as any })}
                >
                    <option value="Available Now">Available Now</option>
                    <option value="Weekends Only">Weekends Only</option>
                    <option value="Booked">Booked</option>
                </select>
            </div>
        </div>
    );
}
