'use client';

import { WorkerProfile } from '@/features/job-sites/data/job-sites';
import { motion } from 'framer-motion';
import styles from './JobGallery.module.css';

interface JobGalleryProps {
    gallery: WorkerProfile['gallery'];
}

export default function JobGallery({ gallery }: JobGalleryProps) {
    return (
        <div className={styles.grid}>
            {gallery.map((item, index) => (
                <motion.div
                    key={index}
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    className={styles.item}
                >
                    <img
                        src={item.url}
                        alt={item.caption}
                        className={styles.image}
                    />
                    <div className={styles.overlay}>
                        <p className={styles.caption}>{item.caption}</p>
                    </div>
                </motion.div>
            ))}
        </div>
    );
}
