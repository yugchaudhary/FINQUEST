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

  const pathname = request.nextUrl.pathname
  const method = request.method
  const isServerAction = request.headers.has('next-action') || method === 'POST'
  const isPrefetch =
    request.headers.get('next-router-prefetch') === '1' ||
    request.headers.get('purpose') === 'prefetch' ||
    request.headers.get('x-nextjs-data') === '1'

  // Server Actions, POST requests, and background prefetch requests must NEVER trigger auth redirects
  if (isServerAction || isPrefetch) {
    return supabaseResponse
  }

  // Fast cookie check for supabase auth tokens
  const allCookies = request.cookies.getAll()
  const hasAuthCookie = allCookies.some(c => c.name.includes('-auth-token'))

  let user = null
  const now = Math.floor(Date.now() / 1000)

  try {
    const { data: sessData } = await supabase.auth.getSession()
    const session = sessData?.session

    if (session?.user) {
      user = session.user
      // Only attempt refresh if token expires in under 2 minutes
      if (session.expires_at && session.expires_at - now < 120) {
        try {
          const { data: refreshData } = await supabase.auth.getUser()
          if (refreshData?.user) {
            user = refreshData.user
          }
        } catch {
          // Keep existing valid user
        }
      }
    } else if (hasAuthCookie) {
      try {
        const { data: authData } = await supabase.auth.getUser()
        user = authData?.user || null
      } catch {
        user = null
      }
    }
  } catch {
    user = null
  }

  // Strictly redirect only on direct GET browser navigations where NO auth cookie exists
  if (!user && !hasAuthCookie) {
    if (pathname.startsWith('/dashboard')) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }
    if (pathname.startsWith('/admin') && !pathname.startsWith('/admin/login')) {
      const url = request.nextUrl.clone()
      url.pathname = '/admin/login'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}
