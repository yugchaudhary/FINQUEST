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
            const persistentOptions = {
              ...options,
              maxAge: options.maxAge ?? 60 * 60 * 24 * 7,
            }
            supabaseResponse.cookies.set(name, value, persistentOptions)
          })
        },
      },
    }
  )

  // Use getSession instead of getUser in middleware to prevent Supabase Auth API rate limits 
  // from logging out all active users when there is high traffic.
  const {
    data: { session },
  } = await supabase.auth.getSession()
  const user = session?.user

  const pathname = request.nextUrl.pathname

  // Unauthenticated: redirect to appropriate login page
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

  // Authenticated: check admin role (skip /admin/login so they can re-auth)
  if (user && pathname.startsWith('/admin') && !pathname.startsWith('/admin/login')) {
    const { data: userData } = await supabase
      .from('users')
      .select('auth_role')
      .eq('id', user.id)
      .single()

    if (userData?.auth_role !== 'ADMIN') {
      const url = request.nextUrl.clone()
      url.pathname = '/admin/login'
      const redirectResponse = NextResponse.redirect(url)
      supabaseResponse.cookies.getAll().forEach(c => redirectResponse.cookies.set(c.name, c.value, c))
      return redirectResponse
    }
  }

  return supabaseResponse
}
