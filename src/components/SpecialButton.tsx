'use client';

import React from 'react';
import styles from './SpecialButton.module.css';

interface SpecialButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    children: React.ReactNode;
}

export default function SpecialButton({ children, className, ...props }: SpecialButtonProps) {
    return (
        <button className={`${styles.button} ${className || ''}`} {...props}>
            {children}
        </button>
    );
}
