'use client';

import { OnboardingData } from '../OnboardingWizard';
import styles from './StepDetails.module.css';

interface StepProps {
    data: OnboardingData;
    updateData: (data: Partial<OnboardingData>) => void;
}

export default function StepDetails({ data, updateData }: StepProps) {
    const workTypes = ['Residential', 'Commercial', 'Industrial', 'Data Center', 'New Construction', 'Maintenance'];

    const toggleWorkType = (type: string) => {
        const current = data.type || [];
        if (current.includes(type as any)) {
            updateData({ type: current.filter((t) => t !== type) as any });
        } else {
            updateData({ type: [...current, type] as any });
        }
    };

    return (
        <div className={styles.container}>
            <div>
                <h2 className={styles.title}>Work Details</h2>
                <p className={styles.subtitle}>Tell us about your experience and what kind of work you do.</p>
            </div>

            <div className={styles.formGroup}>
                <label className={styles.label}>Years of Experience</label>
                <input
                    type="number"
                    className={styles.input}
                    placeholder="e.g. 8"
                    value={data.yearsExperience || ''}
                    onChange={(e) => updateData({ yearsExperience: parseInt(e.target.value) || 0 })}
                />
            </div>

            <div className={styles.formGroup}>
                <label className={styles.label}>Union Status</label>
                <div className={styles.radioGroup}>
                    <label className={styles.radioLabel}>
                        <input
                            type="radio"
                            name="union"
                            value="Union"
                            checked={data.unionStatus === 'Union'}
                            onChange={(e) => updateData({ unionStatus: 'Union' })}
                            className={styles.radio}
                        />
                        Union
                    </label>
                    <label className={styles.radioLabel}>
                        <input
                            type="radio"
                            name="union"
                            value="Non-Union"
                            checked={data.unionStatus === 'Non-Union'}
                            onChange={(e) => updateData({ unionStatus: 'Non-Union' })}
                            className={styles.radio}
                        />
                        Non-Union
                    </label>
                </div>
            </div>

            <div className={styles.formGroup}>
                <label className={styles.label}>Work Types (Select all that apply)</label>
                <div className={styles.checkboxGroup}>
                    {workTypes.map((type) => (
                        <label
                            key={type}
                            className={`${styles.checkboxLabel} ${data.type?.includes(type as any) ? styles.checkboxLabelActive : ''
                                }`}
                        >
                            <input
                                type="checkbox"
                                checked={data.type?.includes(type as any)}
                                onChange={() => toggleWorkType(type)}
                                className={styles.checkbox}
                            />
                            {type}
                        </label>
                    ))}
                </div>
            </div>

            <div className={styles.formGroup}>
                <label className={styles.label}>Certifications (Comma separated)</label>
                <input
                    type="text"
                    className={styles.input}
                    placeholder="e.g. OSHA 30, Journeyman License, Welding Cert"
                    value={data.certifications?.join(', ') || ''}
                    onChange={(e) => updateData({ certifications: e.target.value.split(',').map(s => s.trim()) })}
                />
            </div>
        </div>
    );
}
