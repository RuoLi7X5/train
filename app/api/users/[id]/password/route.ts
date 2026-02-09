import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { hash } from 'bcrypt-ts'
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
  const { password } = await request.json()

  if (!password || password.length < 6) {
    return NextResponse.json({ message: '密码至少6位' }, { status: 400 })
  }

  try {
    // 权限检查
    const targetUser = await prisma.user.findUnique({ where: { id: targetUserId } })
    if (!targetUser) {
        return NextResponse.json({ message: 'User not found' }, { status: 404 })
    }

    let allowed = false

    // 1. 用户自己修改密码
    if (session.user.id === targetUserId) {
        allowed = true
    }
    // 2. 超级管理员重置教练密码
    else if (session.user.role === 'SUPER_ADMIN' && targetUser.role === 'COACH') {
        allowed = true
    }
    // 3. 教练重置自己学生密码
    else if (session.user.role === 'COACH' && targetUser.role === 'STUDENT' && targetUser.coachId === session.user.id) {
        allowed = true
    }

    if (!allowed) {
        return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
    }

    const hashedPassword = await hash(password, 10)

    await prisma.user.update({
        where: { id: targetUserId },
        data: { password: hashedPassword }
    })

    return NextResponse.json({ message: 'Password updated successfully' })

  } catch (error) {
    return NextResponse.json({ message: 'Error updating password' }, { status: 500 })
  }
}
