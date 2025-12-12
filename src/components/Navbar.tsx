'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './Navbar.module.css';

export default function Navbar() {
  const pathname = usePathname();
  const [showPrototypes, setShowPrototypes] = useState(false);

  const prototypes = [
    {
      href: '/prototypes/frequent-flyer',
      label: 'Frequent Flyer',
      description: 'Local events discovery with interactive map'
    },
    {
      href: '/prototypes/aura',
      label: 'Aura',
      description: 'AI-powered vibe reader and visualizer'
    },
    {
      href: '/prototypes/particles',
      label: 'Particles',
      description: '3D morphing particle system'
    },
    {
      href: '/prototypes/job-sites',
      label: 'Job Sites',
      description: 'Professional directory for skilled trades'
    },
    {
      href: '/prototypes/cien',
      label: 'Cien',
      description: '' // Description not provided in instruction, keeping it empty for consistency
    },
  ];

  if (pathname.startsWith('/frequent-flyer')) {
    return null;
  }

  return (
    <nav className={styles.nav}>
      <div className={styles.container}>
        <Link href="/" className={styles.logo}>
          The Lab
        </Link>
        <div className={styles.links}>
          <Link
            href="/"
            className={`${styles.link} ${pathname === '/' ? styles.active : ''}`}
          >
            Home
          </Link>

          {/* Prototypes Dropdown */}
          <div
            className={styles.dropdownWrapper}
            onMouseEnter={() => setShowPrototypes(true)}
            onMouseLeave={() => setShowPrototypes(false)}
          >
            <button className={`${styles.link} ${pathname.startsWith('/prototypes') ? styles.active : ''}`}>
              Prototypes
              <svg
                width="12"
                height="12"
                viewBox="0 0 12 12"
                fill="none"
                className={styles.caret}
              >
                <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            <AnimatePresence>
              {showPrototypes && (
                <motion.div
                  className={styles.dropdown}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.2 }}
                >
                  {prototypes.map((prototype) => (
                    <Link
                      key={prototype.href}
                      href={prototype.href}
                      className={styles.dropdownItem}
                    >
                      <div className={styles.dropdownLabel}>{prototype.label}</div>
                      <div className={styles.dropdownDescription}>{prototype.description}</div>
                    </Link>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <Link
            href="/blog"
            className={`${styles.link} ${pathname.startsWith('/blog') ? styles.active : ''}`}
          >
            Blog
          </Link>

          <Link
            href="/design-system"
            className={`${styles.link} ${pathname === '/design-system' ? styles.active : ''}`}
          >
            Design System
          </Link>
        </div>
      </div>
    </nav>
  );
}
