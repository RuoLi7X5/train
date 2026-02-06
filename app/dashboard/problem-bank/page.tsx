import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function ProblemBankPage() {
  const session = await getSession()
  if (!session || session.user.role !== 'SUPER_ADMIN') {
    redirect('/dashboard')
  }

  const coaches = await prisma.user.findMany({
    where: { role: 'COACH' },
    select: {
      id: true,
      username: true,
      displayName: true,
      createdProblems: {
        orderBy: [{ publishAt: 'desc' }, { date: 'desc' }],
        select: {
          id: true,
          date: true,
          publishAt: true,
          content: true,
          imageUrl: true,
          _count: { select: { submissions: true } }
        }
      }
    }
  } as any)

  const unassigned = await prisma.problem.findMany({
    where: { authorId: null },
    orderBy: [{ publishAt: 'desc' }, { date: 'desc' }],
    select: {
      id: true,
      date: true,
      publishAt: true,
      content: true,
      imageUrl: true,
      _count: { select: { submissions: true } }
    }
  } as any)

  const formatPublishAt = (publishAt: Date | null, date: string) => {
    if (!publishAt) return date
    return new Date(publishAt).toLocaleString()
  }

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold tracking-tight text-gray-800">题库总览</h2>

      {unassigned.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>未归属教练</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {unassigned.map((problem: any) => (
              <div key={problem.id} className="flex items-start justify-between gap-4 border rounded-lg p-4">
                <div className="space-y-1">
                  <div className="text-sm text-gray-500">{formatPublishAt(problem.publishAt, problem.date)}</div>
                  <div className="font-medium text-gray-900">{problem.content}</div>
                </div>
                <div className="text-sm text-gray-500 shrink-0">{problem._count.submissions} 人提交</div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {coaches.map((coach: any) => (
        <Card key={coach.id}>
          <CardHeader>
            <CardTitle>
              {coach.displayName || coach.username}（{coach.createdProblems.length} 题）
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {coach.createdProblems.length === 0 ? (
              <div className="text-gray-500">暂无题目</div>
            ) : (
              coach.createdProblems.map((problem: any) => (
                <div key={problem.id} className="flex items-start justify-between gap-4 border rounded-lg p-4">
                  <div className="space-y-1">
                    <div className="text-sm text-gray-500">{formatPublishAt(problem.publishAt, problem.date)}</div>
                    <div className="font-medium text-gray-900">{problem.content}</div>
                  </div>
                  <div className="text-sm text-gray-500 shrink-0">{problem._count.submissions} 人提交</div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
