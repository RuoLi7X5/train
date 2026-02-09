import { NextResponse } from 'next/server'
import { logout } from '@/lib/auth'

export async function GET(request: Request) {
  await logout()
  
  // Create response to redirect to login
  const url = new URL('/login', request.url)
  const reason = new URL(request.url).searchParams.get('reason')
  if (reason) {
    url.searchParams.set('reason', reason)
  }
  
  return NextResponse.redirect(url)
}
