'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import styles from './page.module.css';
import Card from '@/components/Card';
import Button from '@/components/Button';
import PromptInput from '@/components/PromptInput';
import DigitalBusinessCard from '@/features/job-sites/components/DigitalBusinessCard';
import PhysicalBusinessCard from '@/features/job-sites/components/PhysicalBusinessCard';
import { WorkerProfile } from '@/features/job-sites/data/job-sites';

export default function DesignSystem() {
    const [activeShape, setActiveShape] = useState('Cloud');
    const [activeTab, setActiveTab] = useState<'Core' | 'Industrial'>('Core');
    const shapes = ['Cloud', 'Sphere', 'Cube', 'Helix'];

    const dummyWorker: WorkerProfile = {
        id: 'ds-worker',
        slug: 'ds-worker',
        name: 'Alex Builder',
        trade: 'Master Carpenter',
        location: 'Portland, OR',
        radius: '25 miles',
        yearsExperience: 12,
        unionStatus: 'Union',
        type: ['Commercial', 'Residential'],
        bio: 'Expert carpenter with over a decade of experience in high-end residential and commercial framing.',
        avatar: 'https://images.unsplash.com/photo-1504593811423-6dd665756598?auto=format&fit=crop&q=80&w=256&h=256',
        phone: '(555) 123-4567',
        email: 'alex@builder.com',
        availability: 'Available Now',
        certifications: ['OSHA 30', 'Lead Safety'],
        gallery: [],
        pastProjects: []
    };

    return (
        <div className="container">
            <motion.header
                className={styles.header}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
            >
                <h1 className={styles.title}>Design System</h1>
                <p className={styles.subtitle}>
                    A collection of design tokens and components inspired by Gemini and Airbnb.
                </p>
            </motion.header>

            <div className={styles.tabs}>
                <button
                    className={`${styles.tabBtn} ${activeTab === 'Core' ? styles.tabActive : ''}`}
                    onClick={() => setActiveTab('Core')}
                >
                    Core System
                </button>
                <button
                    className={`${styles.tabBtn} ${activeTab === 'Industrial' ? styles.tabActive : ''}`}
                    onClick={() => setActiveTab('Industrial')}
                >
                    Industrial Theme
                </button>
            </div>

            {
                activeTab === 'Core' ? (
                    <>
                        <motion.section
                            className={styles.section}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, delay: 0.1 }}
                        >
                            <h2 className={styles.sectionTitle}>Colors</h2>
                            <div className={styles.colorGrid}>
                                <div className={styles.colorCard}>
                                    <div className={styles.swatch} style={{ background: 'var(--primary)' }}></div>
                                    <div className={styles.colorInfo}>
                                        <span className={styles.colorName}>Primary</span>
                                        <span className={styles.colorValue}>#0057ff</span>
                                    </div>
                                </div>
                                <div className={styles.colorCard}>
                                    <div className={styles.swatch} style={{ background: 'var(--primary-gradient)' }}></div>
                                    <div className={styles.colorInfo}>
                                        <span className={styles.colorName}>Gradient</span>
                                        <span className={styles.colorValue}>Linear Gradient</span>
                                    </div>
                                </div>
                                <div className={styles.colorCard}>
                                    <div className={styles.swatch} style={{ background: 'var(--foreground)' }}></div>
                                    <div className={styles.colorInfo}>
                                        <span className={styles.colorName}>Foreground</span>
                                        <span className={styles.colorValue}>#1a1a1a</span>
                                    </div>
                                </div>
                                <div className={styles.colorCard}>
                                    <div className={styles.swatch} style={{ background: 'var(--secondary)' }}></div>
                                    <div className={styles.colorInfo}>
                                        <span className={styles.colorName}>Secondary</span>
                                        <span className={styles.colorValue}>#f7f7f7</span>
                                    </div>
                                </div>
                                <div className={styles.colorCard}>
                                    <div className={styles.swatch} style={{ background: 'var(--accent)' }}></div>
                                    <div className={styles.colorInfo}>
                                        <span className={styles.colorName}>Accent</span>
                                        <span className={styles.colorValue}>#ff385c</span>
                                    </div>
                                </div>
                            </div>
                        </motion.section>

                        <motion.section
                            className={styles.section}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, delay: 0.2 }}
                        >
                            <h2 className={styles.sectionTitle}>Typography</h2>
                            <div className={styles.typeScale}>
                                <div className={styles.typeRow}>
                                    <span className={styles.typeLabel}>H1</span>
                                    <h1>The quick brown fox</h1>
                                </div>
                                <div className={styles.typeRow}>
                                    <span className={styles.typeLabel}>H2</span>
                                    <h2>Jumps over the lazy dog</h2>
                                </div>
                                <div className={styles.typeRow}>
                                    <span className={styles.typeLabel}>H3</span>
                                    <h3>To reach the stars</h3>
                                </div>
                                <div className={styles.typeRow}>
                                    <span className={styles.typeLabel}>Body</span>
                                    <p>
                                        Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
                                    </p>
                                </div>
                            </div>
                        </motion.section>

                        <motion.section
                            className={styles.section}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, delay: 0.3 }}
                        >
                            <h2 className={styles.sectionTitle}>Components</h2>
                            <div className={styles.componentGrid}>
                                <div className={styles.componentDemo} style={{ background: '#404040', color: '#fff' }}>
                                    <h3 className={styles.componentLabel}>Buttons</h3>
                                    <div className={styles.buttonGroup}>
                                        <button className="btn btn-primary">Primary Button</button>
                                        <button className="btn btn-secondary">Secondary Button</button>
                                        <Button variant="special">Special Button</Button>
                                        <Button variant="special-2">Special Button 2</Button>
                                    </div>
                                </div>

                                <div className={styles.componentDemo}>
                                    <h3 className={styles.componentLabel}>Card</h3>
                                    <div style={{ maxWidth: '300px' }}>
                                        <Card
                                            title="Example Card"
                                            description="This is how a card looks. It has a hover state and supports tags."
                                            href="#"
                                            tag="Component"
                                        />
                                    </div>
                                </div>
                            </div>
                        </motion.section>

                        <motion.section
                            className={styles.section}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, delay: 0.4 }}
                        >
                            <h2 className={styles.sectionTitle}>Prompt Input</h2>
                            <div style={{ maxWidth: '600px', margin: '0 auto' }}>
                                <PromptInput
                                    value=""
                                    onChange={() => { }}
                                    onSubmit={() => { }}
                                    placeholder="How are you feeling today?"
                                    buttonVariant="special-2"
                                />
                            </div>
                        </motion.section>

                        <motion.section
                            className={styles.section}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, delay: 0.5 }}
                        >
                            <h2 className={styles.sectionTitle}>Particles Buttons (Dark Mode Context)</h2>
                            <div style={{
                                background: '#000',
                                padding: '40px',
                                borderRadius: '16px',
                                display: 'flex',
                                justifyContent: 'center',
                                gap: '16px'
                            }}>
                                {shapes.map((shape) => (
                                    <Button
                                        key={shape}
                                        variant="special"
                                        isActive={activeShape === shape}
                                        onClick={() => setActiveShape(shape)}
                                    >
                                        {shape}
                                    </Button>
                                ))}
                            </div>
                        </motion.section>
                    </>
                ) : (
                    <>
                        <motion.section
                            className={styles.section}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6 }}
                        >
                            <h2 className={styles.sectionTitle}>Industrial Palette</h2>
                            <div className={styles.colorGrid}>
                                <div className={styles.colorCard}>
                                    <div className={styles.swatch} style={{ background: '#ea580c' }}></div>
                                    <div className={styles.colorInfo}>
                                        <span className={styles.colorName}>Industrial Orange</span>
                                        <span className={styles.colorValue}>#ea580c</span>
                                    </div>
                                </div>
                                <div className={styles.colorCard}>
                                    <div className={styles.swatch} style={{ background: '#0a0a0a' }}></div>
                                    <div className={styles.colorInfo}>
                                        <span className={styles.colorName}>Site Black</span>
                                        <span className={styles.colorValue}>#0a0a0a</span>
                                    </div>
                                </div>
                                <div className={styles.colorCard}>
                                    <div className={styles.swatch} style={{ background: '#171717' }}></div>
                                    <div className={styles.colorInfo}>
                                        <span className={styles.colorName}>Tool Grey</span>
                                        <span className={styles.colorValue}>#171717</span>
                                    </div>
                                </div>
                                <div className={styles.colorCard}>
                                    <div className={styles.swatch} style={{ background: '#262626' }}></div>
                                    <div className={styles.colorInfo}>
                                        <span className={styles.colorName}>Metal Grey</span>
                                        <span className={styles.colorValue}>#262626</span>
                                    </div>
                                </div>
                            </div>
                        </motion.section>

                        <motion.section
                            className={styles.section}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, delay: 0.1 }}
                        >
                            <h2 className={styles.sectionTitle}>Industrial Components</h2>
                            <div className={styles.componentGrid}>
                                <div className={styles.componentDemo} style={{ background: '#000', color: '#fff' }}>
                                    <h3 className={styles.componentLabel}>Digital Card</h3>
                                    <div style={{ maxWidth: '400px', margin: '0 auto' }}>
                                        <DigitalBusinessCard worker={dummyWorker} />
                                    </div>
                                </div>

                                <div className={styles.componentDemo} style={{ background: '#1a1a1a', color: '#fff' }}>
                                    <h3 className={styles.componentLabel}>Business Card (Printable)</h3>
                                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                                        <PhysicalBusinessCard worker={dummyWorker} />
                                    </div>
                                </div>
                            </div>
                        </motion.section>
                    </>
                )
            }
        </div >
    );
}
