import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
const CONFIGURED = /^https:\/\/.+\.supabase\./.test(URL) && !!KEY;

// Routes that require a signed-in account.
const PROTECTED = ['/dashboard', '/humidor', '/profile'];

export async function middleware(request: NextRequest) {
  // Demo mode (no Supabase): don't gate anything — the app runs on localStorage.
  if (!CONFIGURED) return NextResponse.next();

  const response = NextResponse.next({ request });

  const supabase = createServerClient(URL, KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(toSet: { name: string; value: string; options: CookieOptions }[]) {
        toSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  // Refreshes the auth token and keeps the cookie current.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  if (!user && PROTECTED.some((p) => path.startsWith(p))) {
    const url = request.nextUrl.clone();
    url.pathname = '/register';
    url.searchParams.set('next', path);
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  // Run on app routes, skip static assets and the data files.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|myhumidor-.*|.*\\.png$).*)'],
};
