import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function POST(request: Request) {
  const session = await getSession()
  if (!session || (session.user.role !== 'COACH' && session.user.role !== 'SUPER_ADMIN')) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { userIds, action } = await request.json()

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json({ message: 'No users selected' }, { status: 400 })
    }

    // Verify ownership and status
    const whereClause: any = {
      id: { in: userIds },
      status: 'PENDING'
    }

    // 如果是普通教练，必须只能操作自己的学生
    // 如果是超级管理员，可以操作所有 PENDING 账号（包括自己生成的教练，或者需要兜底处理的情况）
    if (session.user.role === 'COACH') {
      whereClause.coachId = session.user.id
    }

    const count = await prisma.user.count({
        where: whereClause
    })

    if (count !== userIds.length) {
        return NextResponse.json({ message: 'Invalid selection: Users must be PENDING and assigned to you.' }, { status: 403 })
    }

    if (action === 'confirm') {
        await prisma.user.updateMany({
            where: { id: { in: userIds } },
            data: { status: 'ACTIVE' }
        })
        return NextResponse.json({ message: 'Confirmed' })
    } else if (action === 'cancel') {
        // Physical delete to release IDs (usernames)
        await prisma.user.deleteMany({
             where: { id: { in: userIds } }
        })
        return NextResponse.json({ message: 'Cancelled and released' })
    }

    return NextResponse.json({ message: 'Invalid action' }, { status: 400 })

  } catch (error) {
    console.error(error)
    return NextResponse.json({ message: 'Error processing batch action' }, { status: 500 })
  }
}
