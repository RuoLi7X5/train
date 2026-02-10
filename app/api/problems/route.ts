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
      const timeClause = {
        OR: [
          { publishAt: { lte: now } },
          { publishAt: null, date: { lte: today } }
        ]
      }

      // 学生可以看到：
      // 1. 自己教练发布的 visibility=STUDENTS 的题目
      // 2. 所有 visibility=COMMUNITY 的题目
      // 3. 系统题目（authorId=null，兼容旧数据）
      if (session.user.coachId) {
        where.AND = [
          timeClause,
          {
            OR: [
              { authorId: session.user.coachId, visibility: 'STUDENTS' },
              { visibility: 'COMMUNITY' },
              { authorId: null } // 兼容旧数据
            ]
          }
        ]
      } else {
        where.AND = [
          timeClause,
          {
            OR: [
              { visibility: 'COMMUNITY' },
              { authorId: null } // 兼容旧数据
            ]
          }
        ]
      }
    } else if (session.user.role === 'COACH') {
      // 教练可以看到自己创建的所有题目（包括私有草稿）
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
    const { publishAt, content, imageUrl, answerContent, answerImageUrl, answerReleaseHours, visibility, pushToStudents, pushDueAt, boardData, placementMode, firstPlayer, answerMoves } = await request.json()

    if (!publishAt || !content) {
      return NextResponse.json({ message: '发布时间和内容必填' }, { status: 400 })
    }

    // 验证 visibility 参数
    const validVisibility = ['PRIVATE', 'STUDENTS', 'COMMUNITY'].includes(visibility) ? visibility : 'STUDENTS'

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
        visibility: validVisibility,
        boardData: boardData || null,
        placementMode: placementMode || null,
        firstPlayer: firstPlayer || null,
        answerMoves: answerMoves || null
      }
    })

    let pushedCount = 0
    // 只有 visibility 为 STUDENTS 时才允许推送
    if (pushToStudents && validVisibility === 'STUDENTS') {
      if (!pushDueAt) {
        return NextResponse.json({ message: '推送时必须设置截止时间' }, { status: 400 })
      }
      const dueDate = new Date(pushDueAt)
      if (Number.isNaN(dueDate.getTime())) {
        return NextResponse.json({ message: '截止时间格式无效' }, { status: 400 })
      }

      const students = await prisma.user.findMany({
        where: { role: 'STUDENT', coachId: session.user.id },
        select: { id: true }
      })

      if (students.length > 0) {
        const result = await problemPushModel.createMany({
          data: students.map((student) => ({
            problemId: problem.id,
            studentId: student.id,
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
