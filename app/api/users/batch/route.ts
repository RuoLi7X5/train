import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { hash } from 'bcrypt-ts'
import { getSession } from '@/lib/auth'

export const runtime = 'edge'

export async function POST(request: Request) {
  const session = await getSession()
  // Allow SUPER_ADMIN or COACH
  if (!session || (session.user.role !== 'COACH' && session.user.role !== 'SUPER_ADMIN')) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { count, password } = await request.json()
    const numCount = parseInt(count)

    if (!numCount || numCount <= 0 || numCount > 50) {
      return NextResponse.json({ message: '数量无效 (1-50)' }, { status: 400 })
    }
    if (!password || password.length < 6) {
        return NextResponse.json({ message: '初始密码至少6位' }, { status: 400 })
    }

    const isSuperAdmin = session.user.role === 'SUPER_ADMIN';
    const targetRole = isSuperAdmin ? 'COACH' : 'STUDENT';
    const namePrefix = isSuperAdmin ? '教练' : '棋手';

    // 1. Find Max ID to determine start point
    // Note: In high concurrency, this might cause collision. 
    // Ideally use a database sequence or locking, but for this scale, this is acceptable.
    // We will handle collisions by retrying or strictly failing.
    const lastUser = await prisma.user.findFirst({
        where: { username: { startsWith: 'R' } },
        orderBy: { username: 'desc' }
    })

    let startId = 1
    if (lastUser) {
        const match = lastUser.username.match(/^R(\d{6})$/)
        if (match) {
            startId = parseInt(match[1]) + 1
        }
    }

    const hashedPassword = await hash(password, 10)
    const results = []

    // 2. Generate and Create
    // We do this sequentially to ensure we find a valid ID if there are gaps or collisions
    let currentId = startId
    let createdCount = 0
    let attempts = 0
    const maxAttempts = numCount + 20 // Buffer for collisions

    while (createdCount < numCount && attempts < maxAttempts) {
        attempts++
        const username = `R${currentId.toString().padStart(6, '0')}`
        // 如果是教练，显示名称前缀为"教练"，否则为"棋手"
        const displayName = `${namePrefix}${currentId.toString().padStart(6, '0').slice(-5)}`
        
        try {
            const user = await prisma.user.create({
                data: {
                    username,
                    password: hashedPassword,
                    displayName,
                    role: targetRole,
                    status: 'PENDING',
                    coachId: session.user.id // SuperAdmin creates Coach, Coach creates Student
                },
                select: { id: true, username: true, displayName: true, status: true }
            })
            results.push(user)
            createdCount++
            currentId++
        } catch (e) {
            // Assume unique constraint violation (username exists)
            // Try next ID
            currentId++
        }
    }

    if (createdCount < numCount) {
        // If failed to create all, we return what we have? 
        // Or maybe clean up? For now, return what we have.
        return NextResponse.json({ 
            message: `Requested ${numCount}, created ${createdCount}. Please try again.`, 
            users: results 
        }, { status: 206 }) // Partial Content
    }

    return NextResponse.json({ users: results })

  } catch (error) {
    console.error(error)
    return NextResponse.json({ message: 'Error generating accounts' }, { status: 500 })
  }
}
