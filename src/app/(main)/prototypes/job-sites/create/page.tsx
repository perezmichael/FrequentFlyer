'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import OnboardingWizard from '@/features/job-sites/components/OnboardingWizard';
import styles from './page.module.css';

export default function CreateProfilePage() {
    return (
        <div className={styles.container}>
            <nav className={styles.nav}>
                <div className={styles.navContent}>
                    <Link href="/prototypes/job-sites" className={styles.backLink}>
                        <ArrowLeft size={20} />
                        <span>Cancel</span>
                    </Link>
                    <span className={styles.logo}>
                        Job<span className={styles.highlight}>Site</span>
                    </span>
                </div>
            </nav>

            <main className={styles.main}>
                <OnboardingWizard />
            </main>
        </div>
    );
}
