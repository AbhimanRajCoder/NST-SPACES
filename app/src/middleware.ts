import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    // If Supabase is not configured, skip middleware for login page
    // but still protect other admin routes
    if (!supabaseUrl || !supabaseKey || supabaseUrl === 'your_supabase_url') {
        // Allow login page to show demo/setup message
        if (request.nextUrl.pathname === '/admin/login') {
            return NextResponse.next();
        }
        // For other admin routes, redirect to login
        const url = request.nextUrl.clone();
        url.pathname = '/admin/login';
        url.searchParams.set('error', 'not_configured');
        return NextResponse.redirect(url);
    }

    let supabaseResponse = NextResponse.next({
        request,
    });

    const supabase = createServerClient(
        supabaseUrl,
        supabaseKey,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) =>
                        request.cookies.set(name, value)
                    );
                    supabaseResponse = NextResponse.next({
                        request,
                    });
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    );
                },
            },
        }
    );

    // Check if accessing admin routes
    if (request.nextUrl.pathname.startsWith('/admin')) {
        // Skip login page
        if (request.nextUrl.pathname === '/admin/login') {
            return supabaseResponse;
        }

        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            // Redirect to login
            const url = request.nextUrl.clone();
            url.pathname = '/admin/login';
            return NextResponse.redirect(url);
        }

        // Check email domain restriction
        const allowedDomain = process.env.ADMIN_EMAIL_DOMAIN || 'adypu.edu.in';
        if (!user.email?.endsWith(`@${allowedDomain}`)) {
            // Invalid email domain - sign out and redirect
            await supabase.auth.signOut();
            const url = request.nextUrl.clone();
            url.pathname = '/admin/login';
            url.searchParams.set('error', 'unauthorized');
            return NextResponse.redirect(url);
        }
    }

    return supabaseResponse;
}

export const config = {
    matcher: ['/admin/:path*'],
};
