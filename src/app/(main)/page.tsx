'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';
import Card from "@/components/Card";
import styles from "./page.module.css";

export default function Home() {
  const [filter, setFilter] = useState<'all' | 'prototype' | 'blog' | 'system'>('all');

  const items = [
    {
      title: "Frequent Flyer",
      description: "A local events discovery prototype featuring an interactive map and flyer browsing experience.",
      href: "/prototypes/frequent-flyer",
      tag: "Prototype",
      category: "prototype"
    },
    {
      title: "Aura",
      description: "A generative art experience that visualizes your vibe using AI-simulated sentiment analysis.",
      href: "/prototypes/aura",
      tag: "Prototype",
      category: "prototype"
    },
    {
      title: "Particles",
      description: "A 3D morphing particle system that transitions between geometric shapes using Three.js.",
      href: "/prototypes/particles",
      tag: "Prototype",
      category: "prototype"
    },
    {
      title: "Job Sites",
      description: "A professional directory and digital business card platform for skilled tradespeople.",
      href: "/prototypes/job-sites",
      tag: "Prototype",
      category: "prototype"
    },
    {
      title: "Cien",
      description: "Minimalist Spanish learning with the top 100 words.",
      href: "/prototypes/cien",
      tag: "Prototype",
      category: "prototype"
    },
    {
      title: "Working with AI",
      description: "Thoughts and strategies on how UX designers can leverage AI in their workflow.",
      href: "/blog/working-with-ai",
      tag: "Blog",
      category: "blog"
    },
    {
      title: "Design System",
      description: "A glimpse into the Gemini/Airbnb inspired design system powering this portfolio.",
      href: "/design-system",
      tag: "System",
      category: "system"
    }
  ];

  const filteredItems = filter === 'all'
    ? items
    : items.filter(item => item.category === filter);

  return (
    <div className="container">
      <motion.section
        className={styles.hero}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <h1 className={styles.title}>
          Welcome to <span className="gradient-text">The Lab</span>
        </h1>
        <p className={styles.subtitle}>
          A digital playground for my explorations into AI, Vibe Coding, and the future of UX design.
        </p>
      </motion.section>

      {/* Filter Buttons */}
      <motion.div
        className={styles.filterContainer}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
      >
        <button
          className={`${styles.filterButton} ${filter === 'all' ? styles.filterActive : ''}`}
          onClick={() => setFilter('all')}
        >
          All
        </button>
        <button
          className={`${styles.filterButton} ${filter === 'prototype' ? styles.filterActive : ''}`}
          onClick={() => setFilter('prototype')}
        >
          Prototypes
        </button>
        <button
          className={`${styles.filterButton} ${filter === 'blog' ? styles.filterActive : ''}`}
          onClick={() => setFilter('blog')}
        >
          Blog
        </button>
        <button
          className={`${styles.filterButton} ${filter === 'system' ? styles.filterActive : ''}`}
          onClick={() => setFilter('system')}
        >
          System
        </button>
      </motion.div>

      {/* Cards Grid */}
      <motion.section
        className={styles.grid}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        {filteredItems.map((item) => (
          <Card
            key={item.href}
            title={item.title}
            description={item.description}
            href={item.href}
            tag={item.tag}
          />
        ))}
      </motion.section>

      {/* What is the Lab Section */}
      <motion.section
        className={styles.aboutSection}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3 }}
      >
        <h2 className={styles.sectionTitle}>What is The Lab?</h2>
        <div className={styles.aboutContent}>
          <div className={styles.aboutText}>
            <p>
              The Lab is my creative workspace where I explore the intersection of AI, design, and code.
              It's a place where I experiment with new technologies, prototype innovative UX concepts,
              and push the boundaries of what's possible with AI-assisted design.
            </p>
            <p>
              Here, I practice "vibe coding"—a fluid approach to development where AI tools help translate
              creative vision into working prototypes. Each project is an experiment in blending human
              creativity with machine intelligence.
            </p>
          </div>
          <div className={styles.bentoGrid}>
            <div className={`${styles.bentoItem} ${styles.bentoLarge}`}>
              <img src="/images/office_workspace_wide.png" alt="Modern workspace" />
            </div>
            <div className={styles.bentoItem}>
              <img src="/images/office_desk_closeup.png" alt="Desk setup" />
            </div>
            <div className={styles.bentoItem}>
              <img src="/images/office_creative_corner.png" alt="Creative corner" />
            </div>
          </div>
        </div>
      </motion.section>
    </div>
  );
}
