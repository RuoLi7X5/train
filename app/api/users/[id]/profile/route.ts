import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

/**
 * 获取用户公开信息
 * GET /api/users/[id]/profile
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const userId = parseInt(id)

    if (isNaN(userId)) {
      return NextResponse.json({ message: '无效的用户ID' }, { status: 400 })
    }

    // 获取用户基本信息
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        displayName: true,
        role: true,
        createdAt: true,
        class: {
          select: {
            id: true,
            name: true
          }
        },
        coach: {
          select: {
            id: true,
            username: true,
            displayName: true
          }
        }
      }
    })

    if (!user) {
      return NextResponse.json({ message: '用户不存在' }, { status: 404 })
    }

    // 获取统计数据
    const stats = await getUserStats(userId, user.role)

    // 获取角色特有数据
    let roleSpecificData = {}
    if (user.role === 'COACH' || user.role === 'SUPER_ADMIN') {
      roleSpecificData = await getCoachData(userId)
    } else if (user.role === 'STUDENT') {
      roleSpecificData = await getStudentData(userId)
    }

    return NextResponse.json({
      user,
      stats,
      ...roleSpecificData
    })
  } catch (error) {
    console.error('Error fetching user profile:', error)
    return NextResponse.json({ message: '获取用户信息失败' }, { status: 500 })
  }
}

/**
 * 获取用户统计数据
 */
async function getUserStats(userId: number, role: string) {
  // 提交统计
  const totalSubmissions = await prisma.submission.count({
    where: { userId }
  })

  const correctSubmissions = await prisma.submission.count({
    where: {
      userId,
      status: 'CORRECT'
    }
  })

  // 计算正确率
  const correctRate = totalSubmissions > 0 
    ? Math.round((correctSubmissions / totalSubmissions) * 100) 
    : 0

  // 获取最近提交时间
  const lastSubmission = await prisma.submission.findFirst({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    select: { createdAt: true }
  })

  // 计算连续打卡天数（简化版）
  const recentSubmissions = await prisma.submission.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 100,
    select: { createdAt: true }
  })

  let consecutiveDays = 0
  if (recentSubmissions.length > 0) {
    const dates = new Set<string>()
    recentSubmissions.forEach(s => {
      dates.add(s.createdAt.toISOString().split('T')[0])
    })
    
    const sortedDates = Array.from(dates).sort().reverse()
    const today = new Date().toISOString().split('T')[0]
    
    consecutiveDays = 0
    let checkDate = new Date(today)
    
    for (let i = 0; i < sortedDates.length; i++) {
      const dateStr = checkDate.toISOString().split('T')[0]
      if (sortedDates.includes(dateStr)) {
        consecutiveDays++
        checkDate.setDate(checkDate.getDate() - 1)
      } else {
        break
      }
    }
  }

  return {
    totalSubmissions,
    correctSubmissions,
    correctRate,
    consecutiveDays,
    lastSubmissionAt: lastSubmission?.createdAt
  }
}

/**
 * 获取教练特有数据
 */
async function getCoachData(userId: number) {
  // 创建的题目数（仅已发布的）
  const problemsCount = await prisma.problem.count({
    where: { 
      authorId: userId,
      isDraft: false
    }
  })

  // 学生数
  const studentsCount = await prisma.user.count({
    where: { coachId: userId, role: 'STUDENT' }
  })

  // 最近创建的题目（仅显示已发布的，不显示草稿）
  const recentProblems = await prisma.problem.findMany({
    where: { 
      authorId: userId,
      isDraft: false // 只展示已发布的题目
    },
    orderBy: { createdAt: 'desc' },
    take: 10,
    select: {
      id: true,
      date: true,
      content: true,
      createdAt: true,
      _count: {
        select: { submissions: true }
      }
    }
  })

  return {
    problemsCount,
    studentsCount,
    recentProblems
  }
}

/**
 * 获取学生特有数据
 */
async function getStudentData(userId: number) {
  // 最近的提交记录
  const recentSubmissions = await prisma.submission.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 10,
    select: {
      id: true,
      status: true,
      createdAt: true,
      problem: {
        select: {
          id: true,
          content: true,
          date: true
        }
      }
    }
  })

  // 月度打卡统计（最近3个月）
  const threeMonthsAgo = new Date()
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)

  const monthlyStats = await prisma.submission.groupBy({
    by: ['status'],
    where: {
      userId,
      createdAt: { gte: threeMonthsAgo }
    },
    _count: true
  })

  return {
    recentSubmissions,
    monthlyStats
  }
}
