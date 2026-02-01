import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function GET() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  try {
    const where: any = {}
    
    // 如果是学生，只能看到今天及之前的题目
    if (session.user.role === 'STUDENT') {
        where.date = {
            lte: new Date().toISOString().split('T')[0]
        }
    }

    const problems = await prisma.problem.findMany({
      where,
      orderBy: { date: 'desc' },
      include: {
        _count: {
          select: { submissions: true }
        }
      }
    })
    return NextResponse.json(problems)
  } catch (error) {
    return NextResponse.json({ message: 'Error fetching problems' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const session = await getSession()
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { date, content, imageUrl, answerContent, answerImageUrl, answerReleaseDate } = await request.json()

    if (!date || !content) {
      return NextResponse.json({ message: '日期和内容必填' }, { status: 400 })
    }

    // 检查日期是否重复
    const existing = await prisma.problem.findUnique({
      where: { date }
    })

    if (existing) {
      return NextResponse.json({ message: '该日期已发布过题目' }, { status: 400 })
    }

    // 默认答案发布时间为题目日期的次日0点
    let releaseDate = answerReleaseDate
    if (!releaseDate) {
        const d = new Date(date)
        d.setDate(d.getDate() + 1)
        releaseDate = d.toISOString()
    }

    const problem = await prisma.problem.create({
      data: {
        date,
        content,
        imageUrl,
        answerContent,
        answerImage: answerImageUrl,
        answerReleaseDate: releaseDate
      }
    })

    return NextResponse.json(problem)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ message: 'Error creating problem' }, { status: 500 })
  }
}
