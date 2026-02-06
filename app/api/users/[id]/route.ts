import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export const runtime = 'edge'

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const userId = parseInt(id)
    
    // Check if target user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Authorization logic
    // Only Super Admin can delete users
    const isSuperAdmin = session.user.role === 'SUPER_ADMIN'

    if (!isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden: Only Super Admin can delete users' }, { status: 403 })
    }

    // Attempt to delete
    // Note: This will fail if there are foreign key constraints (e.g. existing submissions)
    // We should probably catch that and tell the user
    try {
      await prisma.user.delete({
        where: { id: userId }
      })
      return NextResponse.json({ success: true })
    } catch (error: any) {
      console.error('Delete user error:', error)
      // Check for Prisma foreign key constraint violation code (P2003)
      if (error.code === 'P2003') {
        return NextResponse.json({ 
          error: '该账号有关联数据（如提交记录、班级等），无法直接删除。请先尝试禁用该账号。' 
        }, { status: 400 })
      }
      throw error
    }

  } catch (error) {
    console.error('Delete user error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
