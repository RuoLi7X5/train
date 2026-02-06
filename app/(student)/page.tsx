import StudyCalendar from '@/components/StudyCalendar'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui'
import { Button } from '@/components/ui'
import { Calendar, CheckCircle, ArrowRight, XCircle, Clock } from 'lucide-react'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export default async function StudentHomePage() {
  const session = await getSession()
  const now = new Date()
  const prismaPush = (prisma as any).problemPush

  let push = null
  if (session?.user?.id) {
    push = await prismaPush.findFirst({
      where: {
        studentId: session.user.id,
        status: { in: ['ACTIVE', 'EXPIRED'] }
      },
      orderBy: { pushedAt: 'desc' },
      include: {
        problem: {
          include: { _count: { select: { submissions: true } } }
        }
      }
    })

    if (push?.status === 'ACTIVE' && push.dueAt && now > push.dueAt) {
      push = await prismaPush.update({
        where: { id: push.id },
        data: { status: 'EXPIRED' },
        include: {
          problem: {
            include: { _count: { select: { submissions: true } } }
          }
        }
      })
    }
  }

  // 获取用户今日提交（最新一条）
  let submission = null
  const problem = push?.problem || null
  const isExpired = push?.status === 'EXPIRED'
  if (problem && session) {
    submission = await prisma.submission.findFirst({
      where: {
        userId: session.user.id,
        problemId: problem.id
      },
      orderBy: { createdAt: 'desc' }
    })
  }

  // 获取班级信息
  let classNameDisplay = null
  if (session?.user.classId) {
    const classInfo = await prisma.class.findUnique({
      where: { id: session.user.classId },
      select: { name: true }
    })
    if (classInfo) {
      classNameDisplay = classInfo.name
    }
  }

  const formatRemaining = (dueAt: Date) => {
    const diff = dueAt.getTime() - now.getTime()
    if (diff <= 0) return '已逾期'
    const totalMinutes = Math.floor(diff / 60000)
    const days = Math.floor(totalMinutes / 1440)
    const hours = Math.floor((totalMinutes % 1440) / 60)
    const minutes = totalMinutes % 60
    const parts = []
    if (days > 0) parts.push(`${days}天`)
    if (hours > 0) parts.push(`${hours}小时`)
    parts.push(`${minutes}分钟`)
    return `剩余 ${parts.join('')}`
  }

  return (
    <div className="space-y-8">
      {/* 欢迎语 */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          你好，{session?.user.displayName || session?.user.username} 👋
          {classNameDisplay && (
            <span className="text-sm font-normal bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
              {classNameDisplay}
            </span>
          )}
        </h1>
        <p className="text-gray-500">坚持每日打卡，积少成多！</p>
      </div>

      {/* 今日任务卡片 */}
      <section>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-blue-600" />
          今日任务
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
                    {push?.dueAt && (
                      <>
                        <span className="text-gray-300 text-sm">|</span>
                        <span className={`text-sm ${push.status === 'EXPIRED' ? 'text-red-600' : 'text-orange-600'}`}>
                          {push.status === 'EXPIRED'
                            ? '已逾期'
                            : formatRemaining(new Date(push.dueAt))}
                        </span>
                      </>
                    )}
                  </div>
                  <p className="text-gray-800 text-lg font-medium line-clamp-2">{problem.content}</p>
                </div>

                {isExpired && !submission ? (
                  <Button className="shrink-0" disabled>
                    已逾期
                  </Button>
                ) : (
                  <Link href={`/problem/${problem.id}`}>
                    <Button className="shrink-0">
                      {submission ? '查看详情' : '去完成'} <ArrowRight className="ml-2 w-4 h-4" />
                    </Button>
                  </Link>
                )}
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
