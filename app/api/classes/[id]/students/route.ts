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
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const classId = parseInt(id)
  const { searchParams } = new URL(request.url)
  const mode = searchParams.get('mode') // 'available' = 获取可添加到班级的学生

  try {
    if (mode === 'available') {
      // 获取所有未分配班级的学生 (classId is null)
      const availableStudents = await prisma.user.findMany({
        where: { 
          role: 'STUDENT',
          classId: null
        },
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
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const classId = parseInt(id)
  const { studentIds, action } = await request.json() // action: 'add' | 'remove'

  if (!Array.isArray(studentIds)) {
    return NextResponse.json({ message: 'Invalid student IDs' }, { status: 400 })
  }

  try {
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
