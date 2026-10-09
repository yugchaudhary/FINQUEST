import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  // We disable Supabase session refresh in middleware because concurrent
  // Server Action requests cause a refresh token race condition which 
  // sporadically deletes cookies and logs users out.
  // Authentication is strictly enforced inside Server Actions and Pages.
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
