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

  // IMPORTANT: Do not run code between createServerClient and
  // supabase.auth.getUser(). getUser() validates and refreshes the auth token
  // from cookies on each request, ensuring users do not randomly sign out.
  let user = null
  try {
    const { data } = await supabase.auth.getUser()
    user = data.user
  } catch {
    user = null
  }

  const pathname = request.nextUrl.pathname

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
