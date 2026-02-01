import StudyCalendar from '@/components/StudyCalendar'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui'
import { Button } from '@/components/ui'
import { Calendar, CheckCircle, ArrowRight, XCircle, Clock } from 'lucide-react'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export default async function StudentHomePage() {
  const session = await getSession()
  const today = new Date().toISOString().split('T')[0]

  // 获取今日题目
  const problem = await prisma.problem.findUnique({
    where: { date: today },
    include: {
      _count: { select: { submissions: true } }
    }
  })

  // 获取用户今日提交（最新一条）
  let submission = null
  if (problem && session) {
    submission = await prisma.submission.findFirst({
      where: {
        userId: session.user.id,
        problemId: problem.id
      },
      orderBy: { createdAt: 'desc' }
    })
  }

  return (
    <div className="space-y-8">
      {/* 欢迎语 */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">你好，{session?.user.displayName || session?.user.username} 👋</h1>
        <p className="text-gray-500">坚持每日打卡，积少成多！</p>
      </div>

      {/* 今日任务卡片 */}
      <section>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-blue-600" />
          今日任务 ({today})
        </h2>

        {problem ? (
          <Card className="border-l-4 border-l-blue-500 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                <div className="space-y-3 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    {submission ? (
                      submission.status === 'CORRECT' ? (
                        <span className="px-3 py-1 bg-green-100 text-green-700 text-sm font-medium rounded-full flex items-center gap-1">
                          <CheckCircle className="w-4 h-4" /> 已完成
                        </span>
                      ) : submission.status === 'WRONG' ? (
                        <span className="px-3 py-1 bg-red-100 text-red-700 text-sm font-medium rounded-full flex items-center gap-1">
                          <XCircle className="w-4 h-4" /> 解答错误
                        </span>
                      ) : (
                        <span className="px-3 py-1 bg-yellow-100 text-yellow-700 text-sm font-medium rounded-full flex items-center gap-1">
                          <Clock className="w-4 h-4" /> 待批改
                        </span>
                      )
                    ) : (
                      <span className="px-3 py-1 bg-gray-100 text-gray-700 text-sm font-medium rounded-full">未完成</span>
                    )}
                    <span className="text-gray-300 text-sm">|</span>
                    <span className="text-gray-500 text-sm">{problem._count.submissions} 人已参与</span>
                  </div>
                  <p className="text-gray-800 text-lg font-medium line-clamp-2">{problem.content}</p>
                </div>

                <Link href={`/problem/${problem.id}`}>
                  <Button className="shrink-0">
                    {submission ? '查看详情' : '去完成'} <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-gray-50 border-dashed">
            <CardContent className="p-8 text-center text-gray-500">
              今日暂无题目，休息一下吧 ☕
            </CardContent>
          </Card>
        )}
      </section>

      {/* 打卡记录 */}
      <section>
        <h2 className="text-lg font-semibold mb-4">学习日历</h2>
        <Card>
          <CardContent className="p-6">
            <StudyCalendar apiEndpoint="/api/stats/heatmap/user" />
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
