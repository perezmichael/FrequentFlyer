'use client';

import { OnboardingData } from '../OnboardingWizard';
import styles from './StepBasics.module.css';

interface StepProps {
    data: OnboardingData;
    updateData: (data: Partial<OnboardingData>) => void;
}

export default function StepBasics({ data, updateData }: StepProps) {
    return (
        <div className={styles.container}>
            <div>
                <h2 className={styles.title}>Let's start with the basics</h2>
                <p className={styles.subtitle}>What should we call you and what do you do?</p>
            </div>

            <div className={styles.formGroup}>
                <label className={styles.label}>Full Name</label>
                <input
                    type="text"
                    className={styles.input}
                    placeholder="e.g. Mike O'Connor"
                    value={data.name || ''}
                    onChange={(e) => updateData({ name: e.target.value })}
                />
            </div>

            <div className={styles.formGroup}>
                <label className={styles.label}>Primary Trade</label>
                <select
                    className={styles.select}
                    value={data.trade || ''}
                    onChange={(e) => updateData({ trade: e.target.value })}
                >
                    <option value="">Select a trade...</option>
                    <option value="Plumber">Plumber</option>
                    <option value="Electrician">Electrician</option>
                    <option value="HVAC Tech">HVAC Tech</option>
                    <option value="Welder">Welder</option>
                    <option value="Pipefitter">Pipefitter</option>
                    <option value="Carpenter">Carpenter</option>
                    <option value="General Contractor">General Contractor</option>
                </select>
            </div>

            <div className={styles.formGroup}>
                <label className={styles.label}>Location (City, State)</label>
                <input
                    type="text"
                    className={styles.input}
                    placeholder="e.g. Chicago, IL"
                    value={data.location || ''}
                    onChange={(e) => updateData({ location: e.target.value })}
                />
            </div>

            <div className={styles.formGroup}>
                <label className={styles.label}>Travel Radius</label>
                <select
                    className={styles.select}
                    value={data.radius || '25 miles'}
                    onChange={(e) => updateData({ radius: e.target.value })}
                >
                    <option value="10 miles">10 miles</option>
                    <option value="25 miles">25 miles</option>
                    <option value="50 miles">50 miles</option>
                    <option value="100+ miles">100+ miles</option>
                    <option value="Nationwide">Nationwide</option>
                </select>
            </div>
        </div>
    );
}
