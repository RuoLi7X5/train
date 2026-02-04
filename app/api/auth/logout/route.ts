import { NextResponse } from 'next/server'
import { logout } from '@/lib/auth'

export const runtime = 'edge'

export async function GET(request: Request) {
  await logout()
  
  // Create response to redirect to login
  const url = new URL('/login', request.url)
  // Add a query param to indicate forced logout if needed
  url.searchParams.set('reason', 'disabled')
  
  return NextResponse.redirect(url)
}
