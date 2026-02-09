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
  const studentId = parseInt(id)

  try {
    const student = await prisma.user.findUnique({
      where: { id: studentId },
      select: { id: true, role: true, coachId: true }
    })

    if (!student || student.role !== 'STUDENT') {
      return NextResponse.json({ message: '学生不存在' }, { status: 404 })
    }

    if (student.coachId) {
      return NextResponse.json({ message: '该学生已绑定其他教练' }, { status: 400 })
    }

    await prisma.user.update({
      where: { id: studentId },
      data: { coachId: session.user.id }
    })

    return NextResponse.json({ success: true, message: '学生已绑定' })
  } catch (error: any) {
    console.error('Bind student error:', error);
    return NextResponse.json({ message: `绑定失败: ${error.message || String(error)}` }, { status: 500 })
  }
}