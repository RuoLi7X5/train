import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { decrypt } from '@/lib/auth'

export async function middleware(request: NextRequest) {
  const sessionCookie = request.cookies.get('session')
  const { pathname } = request.nextUrl

  // 如果是 API 路由或静态资源，直接放行
  // 注意：我们显式放行所有 /api 请求，让 API 路由自己处理权限返回 401，而不是重定向到 HTML 登录页
  if (pathname.startsWith('/api') || pathname.startsWith('/_next') || pathname.startsWith('/static') || pathname.includes('.')) {
    return NextResponse.next()
  }

  // 如果没有 Session
  if (!sessionCookie) {
    // 如果不在登录页，重定向到登录页
    if (pathname !== '/login') {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  } else {
    // 验证 Session
    const session = await decrypt(sessionCookie.value)
    
    if (!session) {
      // Session 无效，重定向到登录页
      if (pathname !== '/login') {
        const response = NextResponse.redirect(new URL('/login', request.url))
        response.cookies.delete('session')
        return response
      }
    } else {
      // 已登录
      const user = session.user

      // 如果已登录且在登录页，重定向
      if (pathname === '/login') {
        if (user.role === 'ADMIN') {
          return NextResponse.redirect(new URL('/dashboard', request.url))
        } else {
          return NextResponse.redirect(new URL('/', request.url))
        }
      }

      // 权限控制：Dashboard 仅限管理员
      if (pathname.startsWith('/dashboard') && user.role !== 'ADMIN') {
        return NextResponse.redirect(new URL('/', request.url))
      }
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api/auth|_next/static|_next/image|favicon.ico).*)'],
}
