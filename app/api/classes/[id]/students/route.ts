import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export const runtime = 'edge';

// 获取班级内的学生，以及（可选）未分配班级的学生用于添加
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session || (session.user.role !== 'SUPER_ADMIN' && session.user.role !== 'COACH')) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const classId = parseInt(id)
  const { searchParams } = new URL(request.url)
  const mode = searchParams.get('mode') // 'available' = 获取可添加到班级的学生

  try {
    if (mode === 'available') {
      const where: any = { 
        role: 'STUDENT',
        classId: null
      }
      
      // 教练只能看到自己的未分配学生
      if (session.user.role === 'COACH') {
          where.coachId = session.user.id
      }

      const availableStudents = await prisma.user.findMany({
        where,
        select: { id: true, username: true, displayName: true }
      })
      return NextResponse.json(availableStudents)
    }

    // 获取当前班级的学生
    const classData = await prisma.class.findUnique({
      where: { id: classId },
      include: {
        students: {
          select: { id: true, username: true, displayName: true }
        }
      }
    })

    if (!classData) {
        return NextResponse.json({ message: 'Class not found' }, { status: 404 })
    }

    // 教练只能查看自己班级的学生
    if (session.user.role === 'COACH' && classData.coachId !== session.user.id) {
        // 如果 classData.coachId 是 null (旧数据)，允许查看? 
        // 还是严格限制? 假设旧数据 coachId 为空，暂时允许查看或强制禁止
        // 这里假设严格限制，如果不匹配则禁止
        if (classData.coachId !== null) {
            return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
        }
    }

    return NextResponse.json(classData.students)
  } catch (error) {
    return NextResponse.json({ message: 'Error fetching students' }, { status: 500 })
  }
}

// 批量添加/移除学生
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session || (session.user.role !== 'SUPER_ADMIN' && session.user.role !== 'COACH')) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const classId = parseInt(id)
  const { studentIds, action } = await request.json() // action: 'add' | 'remove'

  if (!Array.isArray(studentIds)) {
    return NextResponse.json({ message: 'Invalid student IDs' }, { status: 400 })
  }

  try {
    // 权限检查
    if (session.user.role === 'COACH') {
        // 1. 检查班级是否属于该教练
        const classData = await prisma.class.findUnique({ where: { id: classId } })
        if (!classData || classData.coachId !== session.user.id) {
            return NextResponse.json({ message: 'Forbidden: Class not found or access denied' }, { status: 403 })
        }
        
        // 2. 检查学生是否属于该教练 (仅在添加时)
        if (action === 'add') {
            const count = await prisma.user.count({
                where: {
                    id: { in: studentIds },
                    coachId: session.user.id
                }
            })
            if (count !== studentIds.length) {
                 return NextResponse.json({ message: 'Forbidden: Cannot add students not assigned to you' }, { status: 403 })
            }
        }
    }

    if (action === 'add') {
      await prisma.user.updateMany({
        where: { id: { in: studentIds } },
        data: { classId: classId }
      })
    } else if (action === 'remove') {
      await prisma.user.updateMany({
        where: { id: { in: studentIds } },
        data: { classId: null }
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ message: 'Error updating class members' }, { status: 500 })
  }
}
