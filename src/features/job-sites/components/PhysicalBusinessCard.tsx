'use client';

import { forwardRef } from 'react';
import { WorkerProfile } from '@/features/job-sites/data/job-sites';
import { Phone, Mail, MapPin } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import styles from './PhysicalBusinessCard.module.css';

interface Props {
    worker: WorkerProfile;
}

const PhysicalBusinessCard = forwardRef<HTMLDivElement, Props>(({ worker }, ref) => {
    return (
        <div className={styles.cardContainer} ref={ref}>
            <div className={styles.background} />
            <div className={styles.cardContent}>
                <div className={styles.header}>
                    <div className={styles.info}>
                        <h2 className={styles.name}>{worker.name}</h2>
                        <span className={styles.trade}>{worker.trade}</span>
                    </div>
                    <div className={styles.logo}>
                        Job<span className={styles.highlight}>Site</span>
                    </div>
                </div>

                <div className={styles.body}>
                    <div className={styles.contact}>
                        {worker.phone && (
                            <div className={styles.contactItem}>
                                <Phone size={12} />
                                <span>{worker.phone}</span>
                            </div>
                        )}
                        {worker.email && (
                            <div className={styles.contactItem}>
                                <Mail size={12} />
                                <span>{worker.email}</span>
                            </div>
                        )}
                        <div className={styles.contactItem}>
                            <MapPin size={12} />
                            <span>{worker.location}</span>
                        </div>
                    </div>

                    <div className={styles.qrContainer}>
                        <QRCodeSVG
                            value={`https://jobsite.com/${worker.slug}`}
                            size={48}
                            level="M"
                            fgColor="#000000"
                            bgColor="#ffffff"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
});

PhysicalBusinessCard.displayName = 'PhysicalBusinessCard';

export default PhysicalBusinessCard;
