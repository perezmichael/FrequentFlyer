'use client';

import { useState } from 'react';
import { OnboardingData } from '../OnboardingWizard';
import styles from './StepPortfolio.module.css';

interface StepProps {
    data: OnboardingData;
    updateData: (data: Partial<OnboardingData>) => void;
}

export default function StepPortfolio({ data, updateData }: StepProps) {
    const [projectInput, setProjectInput] = useState('');
    const [photoUrl, setPhotoUrl] = useState('');
    const [photoCaption, setPhotoCaption] = useState('');

    const addProject = () => {
        if (projectInput.trim()) {
            updateData({ pastProjects: [...(data.pastProjects || []), projectInput.trim()] });
            setProjectInput('');
        }
    };

    const removeProject = (index: number) => {
        const newProjects = [...(data.pastProjects || [])];
        newProjects.splice(index, 1);
        updateData({ pastProjects: newProjects });
    };

    const addPhoto = () => {
        if (photoUrl.trim() && photoCaption.trim()) {
            updateData({
                gallery: [...(data.gallery || []), { url: photoUrl.trim(), caption: photoCaption.trim() }],
            });
            setPhotoUrl('');
            setPhotoCaption('');
        }
    };

    const removePhoto = (index: number) => {
        const newGallery = [...(data.gallery || [])];
        newGallery.splice(index, 1);
        updateData({ gallery: newGallery });
    };

    return (
        <div className={styles.container}>
            <div>
                <h2 className={styles.title}>Portfolio</h2>
                <p className={styles.subtitle}>Show off your work. Add past projects and photos.</p>
            </div>

            <div className={styles.formGroup}>
                <label className={styles.label}>Past Projects (Company or Project Name)</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                        type="text"
                        className={styles.input}
                        placeholder="e.g. Tesla Gigafactory"
                        value={projectInput}
                        onChange={(e) => setProjectInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && addProject()}
                        style={{ flex: 1 }}
                    />
                    <button onClick={addProject} className={styles.addBtn}>Add</button>
                </div>

                <div className={styles.list}>
                    {data.pastProjects?.map((project, index) => (
                        <div key={index} className={styles.listItem}>
                            <span>{project}</span>
                            <button onClick={() => removeProject(index)} className={styles.removeBtn}>Remove</button>
                        </div>
                    ))}
                </div>
            </div>

            <div className={styles.formGroup}>
                <label className={styles.label}>Photo Gallery</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <input
                        type="text"
                        className={styles.input}
                        placeholder="Image URL (https://...)"
                        value={photoUrl}
                        onChange={(e) => setPhotoUrl(e.target.value)}
                    />
                    <input
                        type="text"
                        className={styles.input}
                        placeholder="Caption (e.g. Main Breaker Panel)"
                        value={photoCaption}
                        onChange={(e) => setPhotoCaption(e.target.value)}
                    />
                    <button onClick={addPhoto} className={styles.addBtn}>Add Photo</button>
                </div>

                <div className={styles.list}>
                    {data.gallery?.map((item, index) => (
                        <div key={index} className={styles.listItem}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <img src={item.url} alt={item.caption} style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px' }} />
                                <span>{item.caption}</span>
                            </div>
                            <button onClick={() => removePhoto(index)} className={styles.removeBtn}>Remove</button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
