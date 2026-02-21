'use client';

import { useEffect } from 'react';

export default function GlobalError({
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
        <html>
            <body>
                <div style={{ padding: '40px', textAlign: 'center' }}>
                    <h2>Something went wrong!</h2>
                    <button
                        onClick={() => reset()}
                        style={{
                            padding: '10px 20px',
                            background: 'black',
                            color: 'white',
                            border: 'none',
                            borderRadius: '5px',
                            cursor: 'pointer',
                        }}
                    >
                        Try again
                    </button>
                </div>
            </body>
        </html>
    );
}
