import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
    // Skip the login page itself to avoid redirect loops
    if (request.nextUrl.pathname === '/admin/login') {
        return NextResponse.next();
    }

    const secret = process.env.ADMIN_SECRET;
    if (!secret) {
        // No secret configured — fail closed
        return NextResponse.redirect(new URL('/', request.url));
    }

    const session = request.cookies.get('admin_session')?.value;
    if (session !== secret) {
        const loginUrl = new URL('/admin/login', request.url);
        loginUrl.searchParams.set('from', request.nextUrl.pathname);
        return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
}

export const config = {
    matcher: '/admin/:path*',
};
