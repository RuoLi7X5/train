import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session || session.user.role !== 'COACH') {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const targetUserId = parseInt(id)

  try {
    const targetUser = await prisma.user.findUnique({ where: { id: targetUserId } })
    if (!targetUser) {
        return NextResponse.json({ message: 'User not found' }, { status: 404 })
    }

    // 只能解绑自己的学生
    if (targetUser.coachId !== session.user.id) {
        return NextResponse.json({ message: 'Forbidden: Not your student' }, { status: 403 })
    }

    // 解绑：清空 coachId 和 classId
    await prisma.user.update({
        where: { id: targetUserId },
        data: {
            coachId: null,
            classId: null
        }
    })

    return NextResponse.json({ message: 'Unbound successfully' })

  } catch (error) {
    return NextResponse.json({ message: 'Error unbinding student' }, { status: 500 })
  }
}
