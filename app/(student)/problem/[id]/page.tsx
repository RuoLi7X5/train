import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { notFound } from 'next/navigation'
import { Card, CardContent } from '@/components/ui'
import { Calendar, CheckCircle, FileText } from 'lucide-react'
import SubmitForm from './SubmitForm'
import CommentsSection from '@/components/CommentsSection'
import SubmissionHistory from './SubmissionHistory'

type Props = {
  params: Promise<{ id: string }>
}

export default async function ProblemPage({ params }: Props) {
  const { id } = await params
  const problemId = parseInt(id)
  
  if (isNaN(problemId)) return notFound()

  const session = await getSession()
  const problem = await prisma.problem.findUnique({
    where: { id: problemId }
  })
  const prismaPush = (prisma as any).problemPush

  if (!problem) return notFound()

  const now = new Date()
  let push = null
  if (session?.user?.id) {
    push = await prismaPush.findFirst({
      where: {
        studentId: session.user.id,
        problemId: problemId
      }
    })

    if (push?.status === 'ACTIVE' && push.dueAt && now > push.dueAt) {
      push = await prismaPush.update({
        where: { id: push.id },
        data: { status: 'EXPIRED' }
      })
    }
  }

  // Get all submissions for this user
  let submissions: any[] = []
  let isCorrect = false
  
  if (session) {
    submissions = await prisma.submission.findMany({
      where: {
        userId: session.user.id,
        problemId: problemId
      },
      orderBy: { createdAt: 'desc' }
    })
    
    isCorrect = submissions.some(s => s.status === 'CORRECT')
  }

  // Check if answer should be visible
  const isAnswerReleased = problem.answerReleaseDate 
    ? new Date() >= new Date(problem.answerReleaseDate) 
    : true // fallback if not set

  // Gatekeeping: Must have submission AND answer must be released (or force show if submitted? user requirement said: "submitted -> can see answer")
  // User requirement: "submitted -> click to view answer". 
  // But also: "answer released 24h after problem".
  // Let's combine: IF submitted AND (Time >= ReleaseDate OR Admin) -> Show
  // Actually, user said "answer also timed release". So even if I submitted, I can't see it until time comes.
  
  const canViewAnswer = submissions.length > 0 && isAnswerReleased
  const isExpired = push?.status === 'EXPIRED'

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-12">
      {/* Problem Card */}
      <Card className="overflow-hidden">
        <div className="bg-blue-50 p-4 border-b border-blue-100 flex justify-between items-center">
          <div className="flex items-center gap-2 text-blue-800 font-medium">
            <Calendar className="w-5 h-5" />
            <span>{problem.date}</span>
          </div>
          {isCorrect && (
            <span className="text-green-600 flex items-center gap-1 text-sm font-medium">
              <CheckCircle className="w-4 h-4"/> 已完成
            </span>
          )}
        </div>
        <CardContent className="p-6 space-y-4">
          <p className="text-lg text-gray-800 whitespace-pre-wrap">{problem.content}</p>
          {problem.imageUrl && (
            <div className="mt-4 rounded-lg overflow-hidden border border-gray-200">
              <img 
                src={problem.imageUrl} 
                alt="Problem" 
                className="w-full h-auto" 
                suppressHydrationWarning
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Official Answer Section - Gatekeeping */}
      {canViewAnswer ? (
        (problem.answerContent || problem.answerImage) && (
          <Card className="border-green-100 bg-green-50/30">
            <CardContent className="p-6 space-y-4">
              <h3 className="font-semibold text-lg flex items-center gap-2 text-green-800">
                <FileText className="w-5 h-5" /> 官方答案解析
              </h3>
              {problem.answerContent && (
                <p className="text-gray-800 whitespace-pre-wrap">{problem.answerContent}</p>
              )}
              {problem.answerImage && (
                <div className="mt-4 rounded-lg overflow-hidden border border-gray-200 w-fit">
                  <img 
                    src={problem.answerImage} 
                    alt="Answer" 
                    className="max-w-full h-auto max-h-96" 
                    suppressHydrationWarning
                  />
                </div>
              )}
            </CardContent>
          </Card>
        )
      ) : (
        <Card className="bg-gray-50 border-dashed">
          <CardContent className="p-8 text-center text-gray-500 flex flex-col items-center gap-2">
            <div className="p-3 bg-gray-100 rounded-full">
              <FileText className="w-6 h-6 text-gray-400" />
            </div>
            <p>
                {submissions.length === 0 
                    ? '提交解答后即可解锁答案与评论区' 
                    : `答案将于 ${new Date(problem.answerReleaseDate || '').toLocaleString()} 公布`}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Submission History */}
      {submissions.length > 0 && (
        <SubmissionHistory submissions={submissions} problemId={problemId} />
      )}

      {/* New Submission Form - Only if not correct yet */}
      {!isCorrect && !isExpired && (
        <SubmitForm problemId={problemId} />
      )}

      {!isCorrect && isExpired && (
        <Card className="bg-gray-50 border-dashed">
          <CardContent className="p-6 text-center text-gray-500">
            已超过截止时间，无法提交
          </CardContent>
        </Card>
      )}

      {/* Comments Section - Gatekeeping */}
      {submissions.length > 0 && (
        <Card>
          <CardContent className="p-6">
            <CommentsSection problemId={problemId} />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
