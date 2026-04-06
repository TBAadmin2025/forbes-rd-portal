import { createClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const searchParams = requestUrl.searchParams

  const errorParam = searchParams.get('error')
  if (errorParam) {
    return NextResponse.redirect(
      new URL(`/login?error=${searchParams.get('error_description') ?? errorParam}`, requestUrl.origin)
    )
  }

  const code = searchParams.get('code')
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type')

  const supabase = await createClient()

  // Code exchange flow (OAuth, magic link, password reset)
  if (code) {
    const { data: { user }, error } = await supabase.auth.exchangeCodeForSession(code)
    if (error || !user) {
      return NextResponse.redirect(new URL('/login?error=auth_failed', requestUrl.origin))
    }

    // Check if this is a password recovery flow
    const recoveryParam = searchParams.get('type')
    if (recoveryParam === 'recovery') {
      return NextResponse.redirect(new URL('/auth/reset-password', requestUrl.origin))
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    const role = profile?.role
    if (role === 'admin' || role === 'super_admin') {
      return NextResponse.redirect(new URL('/admin/dashboard', requestUrl.origin))
    }
    return NextResponse.redirect(new URL('/portal/welcome', requestUrl.origin))
  }

  // Invite flow — redirect to set-password page so new user can create their password
  if (token_hash && type) {
    const setPasswordUrl = new URL('/auth/set-password', requestUrl.origin)
    setPasswordUrl.searchParams.set('token_hash', token_hash)
    setPasswordUrl.searchParams.set('type', type)
    return NextResponse.redirect(setPasswordUrl)
  }

  return NextResponse.redirect(new URL('/login', requestUrl.origin))
}
