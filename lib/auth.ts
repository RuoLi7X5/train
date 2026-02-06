import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import prisma from '@/lib/prisma'

const secretKey = process.env.JWT_SECRET
const key = secretKey ? new TextEncoder().encode(secretKey) : null

const requireKey = () => {
  if (!key) {
    throw new Error('JWT_SECRET is not defined')
  }
  return key
}

export async function encrypt(payload: any) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(requireKey())
}

export async function decrypt(input: string): Promise<any> {
  if (!key) return null
  try {
    const { payload } = await jwtVerify(input, key, {
      algorithms: ['HS256'],
    })
    return payload
  } catch (error) {
    return null
  }
}

export async function login(userData: any) {
  // Create the session
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000)
  const session = await encrypt({ user: userData, expires })

  // Save the session in a cookie
  const cookieStore = await cookies()
  cookieStore.set('session', session, { expires, httpOnly: true })
}

export async function logout() {
  // Destroy the session
  const cookieStore = await cookies()
  cookieStore.set('session', '', { expires: new Date(0) })
}

export async function getSession() {
  const cookieStore = await cookies()
  const session = cookieStore.get('session')?.value
  if (!session) return null
  
  const payload = await decrypt(session)
  if (!payload || !payload.user?.id) return null

  // Double check status from database to support immediate ban/disable
  try {
    const user = await prisma.user.findUnique({
      where: { id: payload.user.id },
      select: { status: true, role: true }
    })

    if (!user || user.status === 'DISABLED') {
      return null
    }
    
    // Optional: Refresh role in session if changed? 
    // For now, just validation is enough.
  } catch (error) {
    console.error('Session validation error:', error)
    // If DB fails, we might want to fail safe or allow? 
    // Failing safe (return null) is better for security.
    return null
  }

  return payload
}
