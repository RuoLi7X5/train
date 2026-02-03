import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export const runtime = 'edge'

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
  const { displayName } = await request.json()

  // Authorization: Users can only update their own profile
  if (session.user.id !== targetUserId) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
  }

  if (!displayName || displayName.trim().length === 0) {
    return NextResponse.json({ message: '昵称不能为空' }, { status: 400 })
  }

  try {
    const updatedUser = await prisma.user.update({
      where: { id: targetUserId },
      data: { displayName },
      select: { displayName: true }
    })

    return NextResponse.json({ success: true, user: updatedUser })
  } catch (error: any) {
    console.error('Update profile error:', error)
    return NextResponse.json({ message: '更新失败' }, { status: 500 })
  }
}