import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export const runtime = 'edge';

export async function GET() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  try {
    const now = new Date()
    const today = now.toISOString().split('T')[0]
    const where: any = {}
    
    if (session.user.role === 'STUDENT') {
      const timeClause = {
        OR: [
          { publishAt: { lte: now } },
          { publishAt: null, date: { lte: today } }
        ]
      }

      if (session.user.coachId) {
        where.AND = [
          timeClause,
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
          { authorId: null }
        ]
      }
    } else if (session.user.role === 'COACH') {
      where.authorId = session.user.id
    }

    const problems = await prisma.problem.findMany({
      where,
      orderBy: [{ publishAt: 'desc' }, { date: 'desc' }],
      include: {
        _count: {
          select: { submissions: true }
        }
      }
    } as any)
    return NextResponse.json(problems)
  } catch (error) {
    return NextResponse.json({ message: 'Error fetching problems' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const session = await getSession()
  if (!session || session.user.role !== 'COACH') {
    return NextResponse.json({ message: 'Unauthorized. Only Coaches can create problems.' }, { status: 401 })
  }

  try {
    const { publishAt, content, imageUrl, answerContent, answerImageUrl, answerReleaseHours, pushToStudents, pushDueAt } = await request.json()

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
        imageUrl,
        answerContent,
        answerImage: answerImageUrl,
        answerReleaseDate: releaseDate,
        authorId: session.user.id
      }
    } as any)

    let pushedCount = 0
    if (pushToStudents) {
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
        const result = await (prisma as any).problemPush.createMany({
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
