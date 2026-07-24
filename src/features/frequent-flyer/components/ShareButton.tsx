'use client';

import { useState } from 'react';

interface ShareButtonProps {
    /** App-relative path to share, e.g. "/event/123". Resolved to an absolute URL client-side. */
    path: string;
    title: string;
    text?: string;
    className?: string;
    label?: string;
}

/**
 * Share the given path. On mobile this opens the native share sheet (Web Share
 * API); on desktop it copies the link to the clipboard with brief confirmation.
 */
export default function ShareButton({ path, title, text, className, label = 'Share' }: ShareButtonProps) {
    const [copied, setCopied] = useState(false);

    const onShare = async (e: React.MouseEvent) => {
        e.stopPropagation();
        const url = typeof window !== 'undefined' ? window.location.origin + path : path;

        if (typeof navigator !== 'undefined' && navigator.share) {
            try {
                await navigator.share({ title, text, url });
            } catch {
                /* user dismissed the share sheet — nothing to do */
            }
            return;
        }

        try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 1800);
        } catch {
            /* clipboard blocked — silently ignore */
        }
    };

    return (
        <button type="button" onClick={onShare} className={className} aria-label={`Share ${title}`}>
            {copied ? 'Link copied' : label}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                {copied ? (
                    <polyline points="20 6 9 17 4 12" />
                ) : (
                    <>
                        <circle cx="18" cy="5" r="3" />
                        <circle cx="6" cy="12" r="3" />
                        <circle cx="18" cy="19" r="3" />
                        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                        <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                    </>
                )}
            </svg>
        </button>
    );
}
