import prisma from '@/lib/prisma'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui'
import { Users, BookOpen, CheckSquare, Clock } from 'lucide-react'
import Heatmap from '@/components/Heatmap'

export default async function DashboardPage() {
  const studentCount = await prisma.user.count({ where: { role: 'STUDENT' } })
  const problemCount = await prisma.problem.count()
  const submissionCount = await prisma.submission.count()
  const pendingCount = await prisma.submission.count({ where: { status: 'PENDING' } })

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-gray-800 mb-6">概览统计</h2>
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatsCard title="总学生数" value={studentCount} icon={<Users className="h-4 w-4 text-gray-500" />} />
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
