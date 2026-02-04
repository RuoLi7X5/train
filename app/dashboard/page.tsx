import prisma from '@/lib/prisma'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui'
import { Users, BookOpen, CheckSquare, Clock } from 'lucide-react'
import Heatmap from '@/components/Heatmap'
import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const session = await getSession()
  if (!session) {
    redirect('/login')
  }

  const { user } = session

  let studentCount = 0
  let problemCount = 0
  let submissionCount = 0
  let pendingCount = 0
  let statsTitle = "概览统计"

  try {
    if (user.role === 'SUPER_ADMIN') {
      statsTitle = "平台概览 (超级管理员)"
      // Parallel queries restored with pool configuration optimized
      const [students, problems, submissions, pending] = await Promise.all([
        prisma.user.count({ where: { role: 'STUDENT' } }),
        prisma.problem.count(),
        prisma.submission.count(),
        prisma.submission.count({ where: { status: 'PENDING' } })
      ])
      studentCount = students
      problemCount = problems
      submissionCount = submissions
      pendingCount = pending
    } else if (user.role === 'COACH') {
      statsTitle = "教学概览"
      // Parallel queries restored
      const [students, problems, submissions, pending] = await Promise.all([
        prisma.user.count({ where: { role: 'STUDENT', coachId: user.id } }),
        prisma.problem.count({ where: { authorId: user.id } }),
        prisma.submission.count({ where: { problem: { authorId: user.id } } }),
        prisma.submission.count({ where: { status: 'PENDING', problem: { authorId: user.id } } })
      ])
      studentCount = students
      problemCount = problems
      submissionCount = submissions
      pendingCount = pending
    }
  } catch (error) {
    console.error('Dashboard stats error:', error)
    // Fallback to 0s to prevent crash
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-gray-800 mb-6">{statsTitle}</h2>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatsCard title="学生人数" value={studentCount} icon={<Users className="h-4 w-4 text-gray-500" />} />
          <StatsCard title="发布题目" value={problemCount} icon={<BookOpen className="h-4 w-4 text-gray-500" />} />
          <StatsCard title="总提交数" value={submissionCount} icon={<CheckSquare className="h-4 w-4 text-gray-500" />} />
          <StatsCard title="待批改" value={pendingCount} icon={<Clock className="h-4 w-4 text-yellow-500" />} />
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4 text-gray-700">提交活跃度 (过去一年)</h3>
        <Card>
          <CardContent className="p-6">
            <Heatmap apiEndpoint="/api/stats/heatmap" colorScheme="blue" />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function StatsCard({ title, value, icon }: { title: string, value: number, icon: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-600">
          {title}
        </CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  )
}
