'use client';

import { WorkerProfile } from '@/features/job-sites/data/job-sites';
import { Phone, Mail, MapPin, Share2, QrCode, Download } from 'lucide-react';
import { motion } from 'framer-motion';
import styles from './DigitalBusinessCard.module.css';

interface DigitalBusinessCardProps {
    worker: WorkerProfile;
}

export default function DigitalBusinessCard({ worker }: DigitalBusinessCardProps) {
    return (
        <div className={styles.container}>
            <motion.div
                initial={{ rotateY: 90, opacity: 0 }}
                animate={{ rotateY: 0, opacity: 1 }}
                transition={{ duration: 0.8, type: 'spring' }}
                className={styles.card}
            >
                {/* Card Header / Banner */}
                <div className={styles.header}>
                    <div className={styles.pattern} />
                    <div className={styles.gradientOverlay} />
                </div>

                {/* Card Content */}
                <div className={styles.content}>
                    <div className={styles.topRow}>
                        <img
                            src={worker.avatar}
                            alt={worker.name}
                            className={styles.avatar}
                        />
                        <div className={styles.actions}>
                            <button className={styles.iconBtn}>
                                <Share2 size={20} />
                            </button>
                            <button className={styles.iconBtn}>
                                <QrCode size={20} />
                            </button>
                        </div>
                    </div>

                    <div className={styles.info}>
                        <h2 className={styles.name}>{worker.name}</h2>
                        <p className={styles.trade}>{worker.trade}</p>
                        <div className={styles.meta}>
                            <MapPin size={16} />
                            <span>{worker.location}</span>
                            <span className={styles.bullet}>•</span>
                            <span>{worker.yearsExperience} Years Exp.</span>
                        </div>

                        <div className={styles.tags}>
                            {worker.type.slice(0, 3).map((type) => (
                                <span key={type} className={styles.tag}>
                                    {type}
                                </span>
                            ))}
                        </div>
                    </div>

                    <div className={styles.contactButtons}>
                        <a href={`tel:${worker.phone}`} className={styles.callBtn}>
                            <Phone size={20} />
                            Call Now
                        </a>
                        <a href={`mailto:${worker.email}`} className={styles.emailBtn}>
                            <Mail size={20} />
                            Email
                        </a>
                    </div>

                    <div className={styles.footer}>
                        <div className={styles.status}>
                            <div className={styles.statusDot} />
                            <span>{worker.availability}</span>
                        </div>
                        <button className={styles.saveBtn}>
                            <Download size={12} />
                            Save Contact
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
