'use client';

import { useEffect } from 'react';

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error(error);
    }, [error]);

    return (
        <div className="bg-cream min-h-screen w-full flex flex-col items-center justify-center gap-[16px] px-6 text-center grain-soft">
            <p className="stamp text-[12px]">error</p>
            <h1 className="font-space-grotesk text-[44px] leading-none font-bold text-ink">
                well, that ripped
            </h1>
            <p className="font-space-mono text-[14px] text-black/55 max-w-[420px]">
                something broke on our end. hit retry — it usually works the second time.
            </p>
            <button
                onClick={() => reset()}
                className="font-space-mono uppercase text-[14px] tracking-[-0.64px] border border-black/40 rounded-full px-6 py-3 hover:bg-black hover:text-cream transition-[color,background-color,transform] duration-150 active:scale-95"
            >
                try again
            </button>
        </div>
    );
}
