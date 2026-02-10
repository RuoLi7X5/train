import { NextResponse } from 'next/server'
import prisma, { problemPushModel } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { Prisma } from '@prisma/client'

export async function GET() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  try {
    const now = new Date()
    const today = now.toISOString().split('T')[0]
    const where: Prisma.ProblemWhereInput = {}
    
    if (session.user.role === 'STUDENT') {
      // 学生可以看到：
      // 1. 自己教练发布的所有非草稿题目
      // 2. 所有其他教练的非草稿题目（通过主页访问）
      // 3. 系统题目（authorId=null，兼容旧数据）
      const timeClause = {
        OR: [
          { publishAt: { lte: now } },
          { publishAt: null, date: { lte: today } }
        ]
      }

      if (session.user.coachId) {
        where.AND = [
          timeClause,
          { isDraft: false }, // 只显示非草稿
          {
            OR: [
              { authorId: session.user.coachId },
              { authorId: null }
            ]
          }
        ]
      } else {
        where.AND = [
          timeClause,
          { isDraft: false }, // 只显示非草稿
          { authorId: null }
        ]
      }
    } else if (session.user.role === 'COACH') {
      // 教练可以看到自己创建的所有题目（包括草稿）
      where.authorId = session.user.id
    } else if (session.user.role === 'SUPER_ADMIN') {
      // 超级管理员可以看到所有题目
      // where 保持为空对象
    }

    const problems = await prisma.problem.findMany({
      where,
      orderBy: [{ publishAt: 'desc' }, { date: 'desc' }],
      include: {
        _count: {
          select: { submissions: true }
        }
      }
    })
    return NextResponse.json(problems)
  } catch (error) {
    console.error('Error fetching problems:', error)
    return NextResponse.json({ message: 'Error fetching problems' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const session = await getSession()
  if (!session || (session.user.role !== 'COACH' && session.user.role !== 'SUPER_ADMIN')) {
    return NextResponse.json({ message: '只有教练或管理员可以出题' }, { status: 401 })
  }

  try {
    const { publishAt, content, imageUrl, answerContent, answerImageUrl, answerReleaseHours, isDraft, pushToStudents, selectedClasses, selectedStudents, pushDueAt, boardData, placementMode, firstPlayer, answerMoves } = await request.json()

    if (!publishAt || !content) {
      return NextResponse.json({ message: '发布时间和内容必填' }, { status: 400 })
    }

    const publishDate = new Date(publishAt)
    if (Number.isNaN(publishDate.getTime())) {
      return NextResponse.json({ message: '发布时间格式无效' }, { status: 400 })
    }

    const date = publishDate.toISOString().split('T')[0]

    const existing = await prisma.problem.findFirst({
      where: { 
        date,
        authorId: session.user.id
      }
    })

    if (existing) {
      return NextResponse.json({ message: '该日期已发布过题目' }, { status: 400 })
    }

    let releaseHours = Number(answerReleaseHours)
    if (!releaseHours || (releaseHours !== 24 && (releaseHours < 1 || releaseHours > 12))) {
      releaseHours = 24
    }

    const releaseDate = new Date(publishDate.getTime() + releaseHours * 60 * 60 * 1000).toISOString()

    const problem = await prisma.problem.create({
      data: {
        date,
        publishAt: publishDate.toISOString(),
        content,
        imageUrl: imageUrl || null,
        answerContent: answerContent || null,
        answerImage: answerImageUrl || null,
        answerReleaseDate: releaseDate,
        authorId: session.user.id,
        isDraft: isDraft === true,
        boardData: boardData || null,
        placementMode: placementMode || null,
        firstPlayer: firstPlayer || null,
        answerMoves: answerMoves || null
      }
    })

    let pushedCount = 0
    // 处理推送：支持按班级和按学生推送
    if (pushToStudents && !isDraft) {
      if (!pushDueAt) {
        return NextResponse.json({ message: '推送时必须设置截止时间' }, { status: 400 })
      }
      const dueDate = new Date(pushDueAt)
      if (Number.isNaN(dueDate.getTime())) {
        return NextResponse.json({ message: '截止时间格式无效' }, { status: 400 })
      }

      // 收集所有需要推送的学生ID
      const targetStudentIds = new Set<number>()

      // 1. 添加选中的学生
      if (selectedStudents && Array.isArray(selectedStudents)) {
        selectedStudents.forEach((id: number) => targetStudentIds.add(id))
      }

      // 2. 添加选中班级的所有学生
      if (selectedClasses && Array.isArray(selectedClasses) && selectedClasses.length > 0) {
        const classStudents = await prisma.user.findMany({
          where: {
            role: 'STUDENT',
            coachId: session.user.id,
            classId: { in: selectedClasses }
          },
          select: { id: true }
        })
        classStudents.forEach((student) => targetStudentIds.add(student.id))
      }

      // 3. 创建推送记录
      if (targetStudentIds.size > 0) {
        const result = await problemPushModel.createMany({
          data: Array.from(targetStudentIds).map((studentId) => ({
            problemId: problem.id,
            studentId,
            coachId: session.user.id,
            dueAt: dueDate.toISOString()
          })),
          skipDuplicates: true
        })
        pushedCount = result.count
      }
    }

    return NextResponse.json({ problem, pushedCount })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ message: 'Error creating problem' }, { status: 500 })
  }
}
