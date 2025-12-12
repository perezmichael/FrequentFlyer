import React from 'react';
import styles from './Button.module.css';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'gemini' | 'special' | 'special-2';
    size?: 'sm' | 'md' | 'lg';
    isActive?: boolean;
    children: React.ReactNode;
}

export default function Button({
    variant = 'primary',
    size = 'md',
    isActive = false,
    className = '',
    children,
    ...props
}: ButtonProps) {
    return (
        <button
            className={`${styles.btn} ${styles[variant]} ${styles[size]} ${isActive ? styles.active : ''} ${className}`}
            {...props}
        >
            {children}
        </button>
    );
}
