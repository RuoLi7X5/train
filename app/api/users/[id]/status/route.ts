import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const targetUserId = parseInt(id)
  const { status } = await request.json()

  // Validate status
  if (!['ACTIVE', 'DISABLED', 'PENDING'].includes(status)) {
    return NextResponse.json({ message: 'Invalid status' }, { status: 400 })
  }

  try {
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, role: true, coachId: true }
    })

    if (!targetUser) {
      return NextResponse.json({ message: '用户不存在' }, { status: 404 })
    }

    let allowed = false

    // Authorization Logic
    if (session.user.role === 'SUPER_ADMIN') {
        // Super Admin can manage ANY Coach
        if (targetUser.role === 'COACH') {
            allowed = true
        }
    } else if (session.user.role === 'COACH') {
        // Coach can manage their OWN Students
        if (targetUser.role === 'STUDENT' && targetUser.coachId === session.user.id) {
            allowed = true
        }
    }

    if (!allowed) {
        return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
    }

    await prisma.user.update({
      where: { id: targetUserId },
      data: { status }
    })

    return NextResponse.json({ success: true, message: `用户状态已更新为 ${status}` })
  } catch (error: any) {
    console.error('Update status error:', error)
    return NextResponse.json({ message: `更新失败: ${error.message || String(error)}` }, { status: 500 })
  }
}