'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useJobSites } from '@/context/JobSitesContext';
import { MapPin, Search, Briefcase, Plus } from 'lucide-react';
import styles from './page.module.css';

export default function JobSitesPage() {
    const { workers } = useJobSites();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedTrade, setSelectedTrade] = useState<string | null>(null);

    const trades = Array.from(new Set(workers.map((w) => w.trade)));

    const filteredWorkers = workers.filter((worker) => {
        const matchesSearch =
            worker.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            worker.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
            worker.bio.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesTrade = selectedTrade ? worker.trade === selectedTrade : true;
        return matchesSearch && matchesTrade;
    });

    return (
        <div className={styles.container}>
            {/* Hero Section */}
            <section className={styles.hero}>
                <div className={styles.heroBackground} />
                <div className={styles.headerActions}>
                    <Link href="/prototypes/job-sites/create" className={styles.createBtn}>
                        <Plus size={20} />
                        Create Profile
                    </Link>
                </div>
                <div className={styles.heroContent}>
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                    >
                        <h1 className={styles.title}>
                            Job<span className={styles.highlight}>Site</span>
                        </h1>
                        <p className={styles.subtitle}>
                            The professional directory for skilled trades. Find the talent building America's future, from data centers to industrial plants.
                        </p>
                    </motion.div>

                    {/* Search & Filter Bar */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                        className={styles.searchContainer}
                    >
                        <div className={styles.searchInputWrapper}>
                            <Search className={styles.searchIcon} />
                            <input
                                type="text"
                                placeholder="Search by name, location, or skill..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className={styles.searchInput}
                            />
                        </div>
                        <div className={styles.filterScroll}>
                            <button
                                onClick={() => setSelectedTrade(null)}
                                className={`${styles.filterBtn} ${selectedTrade === null ? styles.filterBtnActive : styles.filterBtnInactive
                                    }`}
                            >
                                All Trades
                            </button>
                            {trades.map((trade) => (
                                <button
                                    key={trade}
                                    onClick={() => setSelectedTrade(trade)}
                                    className={`${styles.filterBtn} ${selectedTrade === trade ? styles.filterBtnActive : styles.filterBtnInactive
                                        }`}
                                >
                                    {trade}
                                </button>
                            ))}
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* Directory Grid */}
            <section className={styles.gridSection}>
                <div className={styles.grid}>
                    {filteredWorkers.map((worker, index) => (
                        <motion.div
                            key={worker.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: index * 0.1 }}
                        >
                            <Link href={`/prototypes/job-sites/${worker.slug}`}>
                                <div className={styles.card}>
                                    <div className={styles.cardHeader}>
                                        <div className={styles.workerInfo}>
                                            <img
                                                src={worker.avatar}
                                                alt={worker.name}
                                                className={styles.avatar}
                                            />
                                            <div>
                                                <h3 className={styles.name}>{worker.name}</h3>
                                                <div className={styles.trade}>
                                                    <Briefcase size={14} />
                                                    <span>{worker.trade}</span>
                                                </div>
                                            </div>
                                        </div>
                                        {worker.unionStatus === 'Union' && (
                                            <span className={styles.unionBadge}>UNION</span>
                                        )}
                                    </div>

                                    <div className={styles.cardBody}>
                                        <div className={styles.detailRow}>
                                            <MapPin size={14} />
                                            <span>{worker.location}</span>
                                            <span>•</span>
                                            <span>{worker.radius} radius</span>
                                        </div>
                                        <div className={styles.tags}>
                                            {worker.type.slice(0, 2).map((type) => (
                                                <span key={type} className={styles.tag}>
                                                    {type}
                                                </span>
                                            ))}
                                            {worker.type.length > 2 && (
                                                <span className={styles.tag}>+{worker.type.length - 2}</span>
                                            )}
                                        </div>
                                    </div>

                                    <div className={styles.cardFooter}>
                                        <span className={styles.exp}>{worker.yearsExperience} years exp.</span>
                                        <span className={styles.viewProfile}>View Profile →</span>
                                    </div>
                                </div>
                            </Link>
                        </motion.div>
                    ))}
                </div>

                {filteredWorkers.length === 0 && (
                    <div className={styles.emptyState}>
                        <p>No workers found matching your criteria.</p>
                    </div>
                )}
            </section>
        </div>
    );
}
