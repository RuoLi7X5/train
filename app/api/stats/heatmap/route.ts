import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export const runtime = 'edge';

export async function GET() {
  try {
    const problems = await prisma.problem.findMany({
      select: {
        date: true,
        _count: {
          select: { submissions: true }
        }
      },
      where: {
        date: {
          gte: new Date(new Date().setFullYear(new Date().getFullYear() - 1)).toISOString().split('T')[0]
        }
      }
    })

    // 映射表
    const countMap = new Map()
    problems.forEach(p => {
      countMap.set(p.date, p._count.submissions)
    })

    const data = []
    const today = new Date()
    for (let i = 365; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      const dateStr = d.toISOString().split('T')[0]
      
      const count = countMap.get(dateStr) || 0
      let level = 0
      if (count > 0) {
        if (count <= 2) level = 1
        else if (count <= 5) level = 2
        else if (count <= 10) level = 3
        else level = 4
      }

      data.push({
        date: dateStr,
        count: count,
        level: level
      })
    }

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ message: 'Error fetching stats' }, { status: 500 })
  }
}
