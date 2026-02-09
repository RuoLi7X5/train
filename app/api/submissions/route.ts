import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function GET(request: Request) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const problemId = searchParams.get('problemId')
  const status = searchParams.get('status')
  // 管理员和教练逻辑
  if (session.user.role === 'SUPER_ADMIN' || session.user.role === 'COACH') {
    const where: any = {}
    if (status && status !== 'ALL') where.status = status
    if (problemId) where.problemId = parseInt(problemId)
    
    // 如果是教练，只能看到自己题目下的提交
    if (session.user.role === 'COACH') {
      where.problem = {
        authorId: session.user.id
      }
    }
    
    // 获取提交
    const submissions = await prisma.submission.findMany({
      where,
      include: { 
        problem: true, 
        user: {
          select: { id: true, username: true, displayName: true, class: true }
        },
        gradedBy: {
          select: { id: true, username: true, displayName: true }
        }
      } as any,
      orderBy: { createdAt: 'desc' }
    })
    return NextResponse.json(submissions)
  }

  // 学生逻辑：查看自己的提交
  if (!problemId) {
    // 返回该学生的所有提交记录
    const submissions = await prisma.submission.findMany({
      where: { userId: session.user.id },
      include: { problem: true },
      orderBy: { createdAt: 'desc' }
    })
    return NextResponse.json(submissions)
  }

  // 返回特定题目的所有提交记录（列表）
  const submissions = await prisma.submission.findMany({
    where: {
      userId: session.user.id,
      problemId: parseInt(problemId)
    },
    orderBy: { createdAt: 'desc' }
  })

  return NextResponse.json(submissions)
}

export async function POST(request: Request) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { problemId, content, imageUrl, moves, elapsedSeconds, isTimeout } = await request.json()
    const pId = parseInt(problemId)

    if (!pId) {
      return NextResponse.json({ message: 'Problem ID required' }, { status: 400 })
    }

    const prismaPush = (prisma as any).problemPush
    const push = await prismaPush.findFirst({
      where: {
        studentId: session.user.id,
        problemId: pId
      }
    })

    if (push?.status === 'EXPIRED') {
      return NextResponse.json({ message: '已超过截止时间，无法提交' }, { status: 403 })
    }

    if (push?.status === 'ACTIVE' && push.dueAt && new Date() > push.dueAt) {
      await prismaPush.update({
        where: { id: push.id },
        data: { status: 'EXPIRED' }
      })
      return NextResponse.json({ message: '已超过截止时间，无法提交' }, { status: 403 })
    }

    // 检查是否已经答对
    const lastCorrect = await prisma.submission.findFirst({
      where: {
        userId: session.user.id,
        problemId: pId,
        status: 'CORRECT'
      }
    })

    if (lastCorrect) {
      return NextResponse.json({ message: '您已完成该题，无需重复提交' }, { status: 400 })
    }

    const normalizedMoves = Array.isArray(moves)
      ? moves
          .map((m: any) => ({ x: Number(m?.x), y: Number(m?.y) }))
          .filter((m: any) => Number.isFinite(m.x) && Number.isFinite(m.y))
      : null

    const submission = await prisma.submission.create({
      data: {
        userId: session.user.id,
        problemId: pId,
        content,
        imageUrl,
        moves: normalizedMoves || undefined,
        status: 'PENDING',
        elapsedSeconds: Number.isFinite(Number(elapsedSeconds)) ? Math.max(0, Math.floor(Number(elapsedSeconds))) : undefined,
        isTimeout: Boolean(isTimeout)
      } as any
    })

    if (push?.status === 'ACTIVE') {
      await prismaPush.update({
        where: { id: push.id },
        data: { status: 'COMPLETED' }
      })
    }

    return NextResponse.json(submission)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ message: 'Submission failed' }, { status: 500 })
  }
}
