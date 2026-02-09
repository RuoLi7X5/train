import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function GET() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  try {
    // 1. 获取用户所有的提交记录 (关联题目的日期)
    const submissions = await prisma.submission.findMany({
      where: { userId: session.user.id },
      include: {
        problem: {
          select: { date: true }
        }
      }
    })

    // 2. 构建日期映射 Set，方便快速查找
    const submittedDates = new Set(submissions.map(s => s.problem.date))

    // 3. 生成过去 365 天的数据
    const data = []
    const today = new Date()
    for (let i = 365; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      const dateStr = d.toISOString().split('T')[0]
      
      const isSubmitted = submittedDates.has(dateStr)
      
      data.push({
        date: dateStr,
        count: isSubmitted ? 1 : 0,
        level: isSubmitted ? 1 : 0 // 1 = 绿色, 0 = 灰色/白色
      })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ message: 'Error fetching user stats' }, { status: 500 })
  }
}
