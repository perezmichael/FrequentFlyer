'use client';

import { useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useJobSites } from '@/context/JobSitesContext';
import DigitalBusinessCard from '@/features/job-sites/components/DigitalBusinessCard';
import PhysicalBusinessCard from '@/features/job-sites/components/PhysicalBusinessCard';
import JobGallery from '@/features/job-sites/components/JobGallery';
import { ArrowLeft, CheckCircle2, ShieldCheck, HardHat, Download, Loader2, CreditCard } from 'lucide-react';
import { motion } from 'framer-motion';
import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';
import styles from './page.module.css';

export default function WorkerProfilePage() {
    const params = useParams();
    const { workers } = useJobSites();
    const worker = workers.find((w) => w.slug === params.slug);
    const cardRef = useRef<HTMLDivElement>(null);
    const [isDownloading, setIsDownloading] = useState(false);

    const handleDownloadCard = async () => {
        if (cardRef.current && worker) {
            setIsDownloading(true);
            try {
                // Small delay to ensure rendering is complete
                await new Promise(resolve => setTimeout(resolve, 100));

                const dataUrl = await toPng(cardRef.current, {
                    cacheBust: true,
                    pixelRatio: 2,
                    backgroundColor: '#0a0a0a'
                });

                const pdf = new jsPDF({
                    orientation: 'landscape',
                    unit: 'in',
                    format: [3.5, 2]
                });
                pdf.addImage(dataUrl, 'PNG', 0, 0, 3.5, 2);
                pdf.save(`${worker.name}-business-card.pdf`);
            } catch (err) {
                console.error('Failed to download card:', err);
                alert('Failed to generate PDF. Please try again.');
            } finally {
                setIsDownloading(false);
            }
        }
    };

    if (!worker) {
        return (
            <div className={styles.container} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                Worker not found
            </div>
        );
    }

    return (
        <div className={styles.container}>
            {/* Navigation */}
            <nav className={styles.nav}>
                <div className={styles.navContent}>
                    <Link href="/prototypes/job-sites" className={styles.backLink}>
                        <ArrowLeft size={20} />
                        <span>Back to Directory</span>
                    </Link>
                    <span className={styles.logo}>
                        Job<span className={styles.highlight}>Site</span>
                    </span>
                </div>
            </nav>

            <main className={styles.main}>
                <div className={styles.layout}>
                    {/* Left Column: Digital Business Card (Sticky) */}
                    <div className={styles.stickyColumn}>
                        <DigitalBusinessCard worker={worker} />

                        <div className={styles.qrSection}>
                            <p className={styles.qrLabel}>Scan to view profile on phone</p>
                            <div className={styles.qrBox}>
                                {/* Placeholder for QR Code */}
                                <div className={styles.qrPlaceholder}>
                                    QR Code
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Detailed Info */}
                    <div className={styles.contentColumn}>

                        {/* Bio Section */}
                        <section>
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5 }}
                            >
                                <h1 className={styles.workerName}>{worker.name}</h1>
                                <div className={styles.badges}>
                                    {worker.unionStatus === 'Union' && (
                                        <span className={`${styles.badge} ${styles.badgeUnion}`}>
                                            <ShieldCheck size={16} />
                                            Union Member
                                        </span>
                                    )}
                                    <span className={`${styles.badge} ${styles.badgeExp}`}>
                                        <HardHat size={16} />
                                        {worker.yearsExperience} Years Experience
                                    </span>
                                </div>
                                <p className={styles.bio}>
                                    {worker.bio}
                                </p>
                            </motion.div>
                        </section>

                        {/* Certifications & Skills */}
                        <section>
                            <h2 className={styles.sectionTitle}>
                                <CheckCircle2 size={24} className={styles.sectionIcon} />
                                Credentials & Skills
                            </h2>
                            <div className={styles.credentialsGrid}>
                                <div className={styles.credentialCard}>
                                    <h3 className={styles.cardTitle}>Certifications</h3>
                                    <ul className={styles.certList}>
                                        {worker.certifications.map((cert) => (
                                            <li key={cert} className={styles.certItem}>
                                                <div className={styles.bullet} />
                                                {cert}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                <div className={styles.credentialCard}>
                                    <h3 className={styles.cardTitle}>Specialties</h3>
                                    <div className={styles.specialties}>
                                        {worker.type.map((type) => (
                                            <span key={type} className={styles.specialtyTag}>
                                                {type}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Past Projects */}
                        <section>
                            <h2 className={styles.sectionTitle}>Past Projects</h2>
                            <div className={styles.projectTags}>
                                {worker.pastProjects.map((project) => (
                                    <span key={project} className={styles.projectTag}>
                                        {project}
                                    </span>
                                ))}
                            </div>
                            <JobGallery gallery={worker.gallery} />
                        </section>

                        {/* Physical Card Section */}
                        <section className={styles.physicalCardSection}>
                            <h2 className={styles.sectionTitle}>
                                <CreditCard size={24} className={styles.sectionIcon} />
                                Business Card
                            </h2>
                            <div className={styles.physicalCardContainer}>
                                <PhysicalBusinessCard worker={worker} ref={cardRef} />
                                <button
                                    onClick={handleDownloadCard}
                                    disabled={isDownloading}
                                    className={styles.downloadBtn}
                                >
                                    {isDownloading ? <Loader2 className={styles.spin} size={20} /> : <Download size={20} />}
                                    Download PDF
                                </button>
                            </div>
                        </section>

                    </div>
                </div>
            </main>
        </div>
    );
}
