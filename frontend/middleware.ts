/**
 * Next.js Middleware for Supabase Auth
 * Handles session refresh, route protection, and email verification enforcement
 */
import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase-middleware'

// Routes that require authentication AND verified email
const protectedRoutes = [
    '/compare',
    '/reports',
    '/watchlist',
    '/portfolio',
    '/settings',
    '/profile',
]

// Routes that are always public (no auth needed)
const publicRoutes = [
    '/',
    '/login',
    '/signup',
    '/stocks',
    '/news',
    '/companies',
    '/map',
    '/transactions',
    '/forgot-password',
    '/update-password',
    '/verify-email',
]

export async function middleware(request: NextRequest) {
    const { supabaseResponse, user } = await updateSession(request)
    const { pathname } = request.nextUrl

    // Check if route requires auth
    const isProtectedRoute = protectedRoutes.some(route =>
        pathname.startsWith(route)
    )

    // Check if email is verified
    const isEmailVerified = user?.email_confirmed_at != null

    // Redirect unauthenticated users from protected routes
    if (isProtectedRoute && !user) {
        const loginUrl = new URL('/login', request.url)
        loginUrl.searchParams.set('redirect', pathname)
        return NextResponse.redirect(loginUrl)
    }

    // Redirect unverified users from protected routes to verification page
    if (isProtectedRoute && user && !isEmailVerified) {
        return NextResponse.redirect(new URL('/verify-email', request.url))
    }

    // Redirect authenticated users away from login/signup
    if ((pathname === '/login' || pathname === '/signup') && user) {
        // If not verified, redirect to verify-email instead of home
        if (!isEmailVerified) {
            return NextResponse.redirect(new URL('/verify-email', request.url))
        }
        return NextResponse.redirect(new URL('/', request.url))
    }

    // Redirect verified users away from verify-email page
    if (pathname === '/verify-email' && user && isEmailVerified) {
        return NextResponse.redirect(new URL('/', request.url))
    }

    return supabaseResponse
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - public folder
         * - API routes
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$|api).*)',
    ],
}
