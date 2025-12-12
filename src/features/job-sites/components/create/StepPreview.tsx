'use client';

import { useRef, useState } from 'react';
import { OnboardingData } from '../OnboardingWizard';
import { useRouter } from 'next/navigation';
import { useJobSites } from '@/context/JobSitesContext';
import DigitalBusinessCard from '../DigitalBusinessCard';
import PhysicalBusinessCard from '../PhysicalBusinessCard';
import styles from './StepPreview.module.css';
import { WorkerProfile } from '@/features/job-sites/data/job-sites';
import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';
import { Download, Loader2 } from 'lucide-react';

interface StepProps {
    data: OnboardingData;
}

export default function StepPreview({ data }: StepProps) {
    const router = useRouter();
    const { addWorker } = useJobSites();
    const cardRef = useRef<HTMLDivElement>(null);
    const [isDownloading, setIsDownloading] = useState(false);

    // Cast partial data to full profile for preview, using defaults for missing fields
    const previewProfile: WorkerProfile = {
        id: crypto.randomUUID(),
        slug: (data.name || 'worker').toLowerCase().replace(/\s+/g, '-'),
        name: data.name || 'Your Name',
        trade: data.trade || 'Your Trade',
        location: data.location || 'Location',
        radius: data.radius || '25 miles',
        type: data.type || [],
        unionStatus: data.unionStatus || 'Non-Union',
        yearsExperience: data.yearsExperience || 0,
        bio: data.bio || 'Your bio will appear here.',
        avatar: data.avatar || 'https://via.placeholder.com/150',
        phone: data.phone || '',
        email: data.email || '',
        certifications: data.certifications || [],
        availability: data.availability || 'Available Now',
        gallery: data.gallery || [],
        pastProjects: data.pastProjects || [],
    };

    const handleCreateProfile = () => {
        addWorker(previewProfile);
        router.push(`/prototypes/job-sites/${previewProfile.slug}`);
    };

    const handleDownloadCard = async () => {
        if (cardRef.current) {
            setIsDownloading(true);
            try {
                // Small delay to ensure rendering is complete
                await new Promise(resolve => setTimeout(resolve, 100));

                const dataUrl = await toPng(cardRef.current, {
                    cacheBust: true,
                    pixelRatio: 2,
                    backgroundColor: '#0a0a0a' // Ensure background color is captured
                });

                const pdf = new jsPDF({
                    orientation: 'landscape',
                    unit: 'in',
                    format: [3.5, 2]
                });
                pdf.addImage(dataUrl, 'PNG', 0, 0, 3.5, 2);
                pdf.save(`${previewProfile.name}-business-card.pdf`);
            } catch (err) {
                console.error('Failed to download card:', err);
                alert('Failed to generate PDF. Please try again.');
            } finally {
                setIsDownloading(false);
            }
        }
    };

    return (
        <div className={styles.container}>
            <div>
                <h2 className={styles.title}>Preview Your Card</h2>
                <p className={styles.subtitle}>Here's how your digital business card will look. You can go back and edit anything.</p>
            </div>

            <div className={styles.previewGrid}>
                <div className={styles.previewSection}>
                    <h3 className={styles.sectionTitle}>Digital Card</h3>
                    <div className={styles.previewBox}>
                        <DigitalBusinessCard worker={previewProfile} />
                    </div>
                </div>

                <div className={styles.previewSection}>
                    <h3 className={styles.sectionTitle}>Business Card</h3>
                    <div className={styles.previewBox}>
                        <PhysicalBusinessCard worker={previewProfile} ref={cardRef} />
                        <button
                            onClick={handleDownloadCard}
                            disabled={isDownloading}
                            className={styles.downloadBtn}
                        >
                            {isDownloading ? <Loader2 className={styles.spin} size={16} /> : <Download size={16} />}
                            Download PDF
                        </button>
                    </div>
                </div>
            </div>

            <div className={styles.actions}>
                <button onClick={handleCreateProfile} className={styles.createBtn}>
                    Create Profile
                </button>
            </div>
        </div>
    );
}
