import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export const runtime = 'edge';

export async function GET(request: Request) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const problemId = searchParams.get('problemId')
  const status = searchParams.get('status')

  // 管理员逻辑
  if (session.user.role === 'ADMIN') {
    const where: any = {}
    if (status && status !== 'ALL') where.status = status
    if (problemId) where.problemId = parseInt(problemId)
    
    // 获取所有提交
    const submissions = await prisma.submission.findMany({
      where,
      include: { 
        problem: true, 
        user: {
          select: { id: true, username: true, displayName: true, class: true }
        } 
      },
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
    const { problemId, content, imageUrl } = await request.json()
    const pId = parseInt(problemId)

    if (!pId) {
      return NextResponse.json({ message: 'Problem ID required' }, { status: 400 })
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

    const submission = await prisma.submission.create({
      data: {
        userId: session.user.id,
        problemId: pId,
        content,
        imageUrl,
        status: 'PENDING'
      }
    })

    return NextResponse.json(submission)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ message: 'Submission failed' }, { status: 500 })
  }
}
