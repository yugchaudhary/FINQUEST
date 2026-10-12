import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: any[]) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value)
          })
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const isPrefetch =
    request.headers.get('next-router-prefetch') === '1' ||
    request.headers.get('purpose') === 'prefetch'

  let user = null
  const now = Math.floor(Date.now() / 1000)

  // 1. Check local session from cookies first (instant 1ms check, no remote API rate limits)
  const { data: sessData } = await supabase.auth.getSession()
  const session = sessData?.session

  if (session?.user && session.expires_at && session.expires_at > now) {
    user = session.user
    // If token is expiring within 5 minutes, proactively refresh in background
    if (session.expires_at - now < 300 && !isPrefetch) {
      try {
        const { data: refreshData } = await supabase.auth.getUser()
        if (refreshData?.user) {
          user = refreshData.user
        }
      } catch {
        // Keep existing valid user if refresh hits transient network issue
      }
    }
  } else {
    // Session is missing or expired, attempt getUser() to trigger refresh token exchange
    try {
      const { data: authData } = await supabase.auth.getUser()
      user = authData?.user || null
    } catch {
      user = null
    }
  }

  const pathname = request.nextUrl.pathname

  // Do not redirect prefetch requests
  if (isPrefetch) {
    return supabaseResponse
  }

  // Protected routes check: redirect to appropriate login page if not authenticated
  if (!user) {
    if (pathname.startsWith('/dashboard')) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      const redirectResponse = NextResponse.redirect(url)
      supabaseResponse.cookies.getAll().forEach(c => redirectResponse.cookies.set(c.name, c.value, c))
      return redirectResponse
    }
    if (pathname.startsWith('/admin') && !pathname.startsWith('/admin/login')) {
      const url = request.nextUrl.clone()
      url.pathname = '/admin/login'
      const redirectResponse = NextResponse.redirect(url)
      supabaseResponse.cookies.getAll().forEach(c => redirectResponse.cookies.set(c.name, c.value, c))
      return redirectResponse
    }
  }

  return supabaseResponse
}
