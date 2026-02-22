'use client';

import { useState } from 'react';
import { adminLogin } from './actions';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function LoginForm() {
    const searchParams = useSearchParams();
    const from = searchParams.get('from') || '/admin';

    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        const result = await adminLogin(password, from);
        if (result?.error) {
            setError(result.error);
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-[16px]">
            <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Password"
                autoFocus
                required
                style={{
                    fontFamily: 'var(--font-space-mono)',
                    fontSize: '16px',
                    padding: '12px 16px',
                    border: '1px solid rgba(0,0,0,0.2)',
                    background: 'white',
                    outline: 'none',
                    width: '100%',
                }}
            />
            {error && (
                <p style={{ fontFamily: 'var(--font-space-mono)', fontSize: '13px', color: '#c00', margin: 0 }}>
                    {error}
                </p>
            )}
            <button
                type="submit"
                disabled={loading}
                style={{
                    fontFamily: 'var(--font-space-mono)',
                    fontSize: '14px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    padding: '12px',
                    background: loading ? 'rgba(0,0,0,0.4)' : 'black',
                    color: 'white',
                    border: 'none',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    width: '100%',
                }}
            >
                {loading ? 'Entering...' : 'Enter'}
            </button>
        </form>
    );
}

export default function AdminLoginPage() {
    return (
        <div style={{
            minHeight: '100dvh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#FFFAEB',
        }}>
            <div style={{ width: '100%', maxWidth: '360px', padding: '0 24px' }}>
                <h1 style={{
                    fontFamily: 'var(--font-space-grotesk)',
                    fontWeight: 700,
                    fontSize: '28px',
                    textTransform: 'uppercase',
                    letterSpacing: '-0.84px',
                    marginBottom: '32px',
                }}>
                    Admin
                </h1>
                <Suspense>
                    <LoginForm />
                </Suspense>
            </div>
        </div>
    );
}
