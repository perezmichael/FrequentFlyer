'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export async function adminLogin(password: string, from: string) {
    const secret = process.env.ADMIN_SECRET;
    if (!secret || password !== secret) {
        return { error: 'Incorrect password' };
    }

    const cookieStore = await cookies();
    cookieStore.set('admin_session', secret, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: '/',
    });

    redirect(from && from.startsWith('/admin') ? from : '/admin');
}

export async function adminLogout() {
    const cookieStore = await cookies();
    cookieStore.delete('admin_session');
    redirect('/admin/login');
}
