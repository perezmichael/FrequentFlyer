import React from 'react';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

export default function CienLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className={`${inter.className} min-h-screen bg-black text-white selection:bg-white selection:text-black`}>
            <main className="w-full max-w-md mx-auto min-h-screen flex flex-col relative overflow-hidden">
                {children}
            </main>
        </div>
    );
}
