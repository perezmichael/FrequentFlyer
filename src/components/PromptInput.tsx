'use client';

import React from 'react';
import { motion } from 'framer-motion';
import Button from './Button';
import styles from './PromptInput.module.css';

interface PromptInputProps {
    value: string;
    onChange: (value: string) => void;
    onSubmit: () => void;
    placeholder?: string;
    isLoading?: boolean;
    buttonText?: string;
    loadingText?: string;
    disabled?: boolean;
    buttonVariant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'gemini' | 'special' | 'special-2';
}

export default function PromptInput({
    value,
    onChange,
    onSubmit,
    placeholder = "How are you feeling today?",
    isLoading = false,
    buttonText = "Read Vibe",
    loadingText = "Reading...",
    disabled = false,
    buttonVariant = "special"
}: PromptInputProps) {
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !isLoading && value.trim()) {
            onSubmit();
        }
    };

    return (
        <motion.div
            className={styles.inputWrapper}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
        >
            <div className={styles.inputGlow} />
            <input
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                className={styles.input}
                disabled={disabled || isLoading}
            />
            <Button
                onClick={onSubmit}
                disabled={disabled || isLoading || !value.trim()}
                variant={buttonVariant}
                className={styles.submitButton}
            >
                {isLoading ? loadingText : buttonText}
            </Button>
        </motion.div>
    );
}
