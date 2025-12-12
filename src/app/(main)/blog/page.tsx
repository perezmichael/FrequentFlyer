'use client';

import { motion } from 'framer-motion';
import Card from '@/components/Card';
import styles from './page.module.css';

export default function BlogPage() {
    const posts = [
        {
            title: 'Working with AI as a UX Designer',
            description: 'Thoughts and strategies on how UX designers can leverage AI in their workflow.',
            href: '/blog/working-with-ai',
            date: 'November 23, 2025',
            category: 'Thoughts'
        }
    ];

    return (
        <div className="container">
            <motion.header
                className={styles.header}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
            >
                <h1 className={styles.title}>Blog</h1>
                <p className={styles.subtitle}>
                    Thoughts on AI, design, and the future of UX.
                </p>
            </motion.header>

            <motion.section
                className={styles.grid}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
            >
                {posts.map((post) => (
                    <Card
                        key={post.href}
                        title={post.title}
                        description={post.description}
                        href={post.href}
                        tag={post.category}
                    />
                ))}
            </motion.section>
        </div>
    );
}
