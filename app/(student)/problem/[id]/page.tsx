import prisma, { problemPushModel } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { notFound } from 'next/navigation'
import { Card, CardContent } from '@/components/ui'
import { Calendar, CheckCircle, FileText } from 'lucide-react'
import SubmitForm from './SubmitForm'
import CommentsSection from '@/components/CommentsSection'
import SubmissionHistory from './SubmissionHistory'
import { Problem } from '@prisma/client'

type StoneColor = 'B' | 'W'
type BoardStone = { x: number; y: number; color: StoneColor }
type BoardData = { size: number; stones: BoardStone[] }
type Viewport = { minX: number; maxX: number; minY: number; maxY: number }
type FirstPlayer = 'BLACK' | 'WHITE'

// 扩展的 Problem 类型，包含棋盘数据
type ProblemWithBoard = Problem & {
  boardData?: BoardData | null
  firstPlayer?: FirstPlayer | null
}

// Submission 类型兼容 SubmissionHistory 组件
type SubmissionForDisplay = {
  id: number
  content: string | null
  imageUrl: string | null
  status: string
  feedback: string | null
  createdAt: string
  moves?: { x: number; y: number }[] | null
  elapsedSeconds?: number | null
  isTimeout?: boolean | null
}

type Props = {
  params: Promise<{ id: string }>
}

const computeViewport = (boardData: BoardData): Viewport => {
  const size = boardData.size
  if (!boardData.stones || boardData.stones.length === 0) {
    return { minX: 0, maxX: size - 1, minY: 0, maxY: size - 1 }
  }
  let minX = size - 1
  let maxX = 0
  let minY = size - 1
  let maxY = 0
  for (const s of boardData.stones) {
    if (s.x < minX) minX = s.x
    if (s.x > maxX) maxX = s.x
    if (s.y < minY) minY = s.y
    if (s.y > maxY) maxY = s.y
  }
  const mid = Math.floor(size / 2)
  const lowMax = mid - 1
  const highMin = mid + 1
  if (maxX <= lowMax && maxY <= lowMax) return { minX: 0, maxX: lowMax, minY: 0, maxY: lowMax }
  if (minX >= highMin && maxY <= lowMax) return { minX: highMin, maxX: size - 1, minY: 0, maxY: lowMax }
  if (maxX <= lowMax && minY >= highMin) return { minX: 0, maxX: lowMax, minY: highMin, maxY: size - 1 }
  if (minX >= highMin && minY >= highMin) return { minX: highMin, maxX: size - 1, minY: highMin, maxY: size - 1 }
  if (maxX <= lowMax) return { minX: 0, maxX: lowMax, minY: 0, maxY: size - 1 }
  if (minX >= highMin) return { minX: highMin, maxX: size - 1, minY: 0, maxY: size - 1 }
  if (maxY <= lowMax) return { minX: 0, maxX: size - 1, minY: 0, maxY: lowMax }
  if (minY >= highMin) return { minX: 0, maxX: size - 1, minY: highMin, maxY: size - 1 }
  return { minX: 0, maxX: size - 1, minY: 0, maxY: size - 1 }
}

const baseLetters = 'ABCDEFGHJKLMNOPQRST'.split('')

const getLetters = (size: number) => baseLetters.slice(0, size)

const getStarPoints = (size: number) => {
  if (size === 19) {
    return [
      { x: 3, y: 3 },
      { x: 3, y: 9 },
      { x: 3, y: 15 },
      { x: 9, y: 3 },
      { x: 9, y: 9 },
      { x: 9, y: 15 },
      { x: 15, y: 3 },
      { x: 15, y: 9 },
      { x: 15, y: 15 }
    ]
  }
  if (size === 13) {
    return [
      { x: 3, y: 3 },
      { x: 3, y: 9 },
      { x: 6, y: 6 },
      { x: 9, y: 3 },
      { x: 9, y: 9 }
    ]
  }
  if (size === 9) {
    return [
      { x: 2, y: 2 },
      { x: 2, y: 6 },
      { x: 4, y: 4 },
      { x: 6, y: 2 },
      { x: 6, y: 6 }
    ]
  }
  return []
}

const renderBoard = (boardData?: BoardData | null) => {
  if (!boardData) return null
  const size = boardData.size || 19
  const viewport = computeViewport({ size, stones: boardData.stones || [] })
  const letters = getLetters(size)
  const stoneMap = new Map<string, StoneColor>()
  for (const s of boardData.stones || []) {
    stoneMap.set(`${s.x},${s.y}`, s.color)
  }
  const cellSize = 26
  const stoneSize = 20
  const padding = stoneSize / 2
  const labelSize = 18
  const paddingLeft = labelSize + padding
  const paddingTop = labelSize + padding
  const paddingRight = padding
  const paddingBottom = padding
  const cols = viewport.maxX - viewport.minX + 1
  const rows = viewport.maxY - viewport.minY + 1
  const width = (cols - 1) * cellSize
  const height = (rows - 1) * cellSize
  const stones = []
  const labels = []
  const starPoints = []
  const stars = getStarPoints(size)
  for (let y = viewport.minY; y <= viewport.maxY; y += 1) {
    for (let x = viewport.minX; x <= viewport.maxX; x += 1) {
      const c = stoneMap.get(`${x},${y}`)
      if (!c) continue
      stones.push(
        <span
          key={`stone-${x}-${y}`}
          className={`absolute rounded-full ${c === 'B' ? 'bg-black' : 'bg-white border border-gray-400'}`}
          style={{
            width: stoneSize,
            height: stoneSize,
            left: paddingLeft + (x - viewport.minX) * cellSize - stoneSize / 2,
            top: paddingTop + (y - viewport.minY) * cellSize - stoneSize / 2,
          }}
        />
      )
    }
  }
  for (let x = viewport.minX; x <= viewport.maxX; x += 1) {
    labels.push(
      <span
        key={`col-${x}`}
        className="absolute flex items-center justify-center text-[11px] text-black"
        style={{
          width: cellSize,
          height: labelSize,
          left: paddingLeft + (x - viewport.minX) * cellSize - cellSize / 2,
          top: 0
        }}
      >
        {x + 1}
      </span>
    )
  }
  for (let y = viewport.minY; y <= viewport.maxY; y += 1) {
    labels.push(
      <span
        key={`row-${y}`}
        className="absolute flex items-center justify-center text-[11px] text-black"
        style={{
          width: labelSize,
          height: cellSize,
          left: 0,
          top: paddingTop + (y - viewport.minY) * cellSize - cellSize / 2
        }}
      >
        {letters[y]}
      </span>
    )
  }
  for (const p of stars) {
    if (p.x < viewport.minX || p.x > viewport.maxX || p.y < viewport.minY || p.y > viewport.maxY) continue
    starPoints.push(
      <span
        key={`star-${p.x}-${p.y}`}
        className="absolute rounded-full bg-black"
        style={{
          width: 4,
          height: 4,
          left: paddingLeft + (p.x - viewport.minX) * cellSize - 2,
          top: paddingTop + (p.y - viewport.minY) * cellSize - 2
        }}
      />
    )
  }
  return (
    <div
      className="relative inline-block bg-white"
      style={{
        width: width + paddingLeft + paddingRight,
        height: height + paddingTop + paddingBottom,
        paddingLeft,
        paddingTop,
        paddingRight,
        paddingBottom,
      }}
    >
      <span
        className="absolute"
        style={{
          left: paddingLeft,
          top: paddingTop,
          width,
          height,
          backgroundImage:
            'linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)',
          backgroundSize: `${cellSize}px ${cellSize}px`,
          backgroundPosition: '0 0',
          pointerEvents: 'none'
        }}
      />
      <span
        className="absolute"
        style={{
          left: paddingLeft,
          top: paddingTop,
          width,
          height,
          boxShadow: 'inset 0 0 0 2px #000',
          pointerEvents: 'none'
        }}
      />
      {labels}
      {starPoints}
      {stones}
    </div>
  )
}

export default async function ProblemPage({ params }: Props) {
  const { id } = await params
  const problemId = parseInt(id)
  
  if (isNaN(problemId)) return notFound()

  const session = await getSession()
  const problem = await prisma.problem.findUnique({
    where: { id: problemId }
  }) as ProblemWithBoard | null

  if (!problem) return notFound()
  
  const boardData = problem.boardData
  const firstPlayer = problem.firstPlayer

  const now = new Date()
  let push = null
  if (session?.user?.id) {
    push = await problemPushModel.findFirst({
      where: {
        studentId: session.user.id,
        problemId: problemId
      }
    })

    if (push?.status === 'ACTIVE' && push.dueAt && now > push.dueAt) {
      push = await problemPushModel.update({
        where: { id: push.id },
        data: { status: 'EXPIRED' }
      })
    }
  }

  // Get all submissions for this user
  let submissions: SubmissionForDisplay[] = []
  let isCorrect = false
  
  if (session) {
    const rawSubmissions = await prisma.submission.findMany({
      where: {
        userId: session.user.id,
        problemId: problemId
      },
      orderBy: { createdAt: 'desc' }
    })
    
    // Convert Date to string for component compatibility
    submissions = rawSubmissions.map(s => ({
      id: s.id,
      content: s.content,
      imageUrl: s.imageUrl,
      status: s.status,
      feedback: s.feedback,
      createdAt: s.createdAt.toISOString(),
      moves: s.moves as { x: number; y: number }[] | null,
      elapsedSeconds: s.elapsedSeconds,
      isTimeout: s.isTimeout
    }))
    
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
          {boardData
            ? renderBoard(boardData)
            : problem.imageUrl && (
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
        <SubmissionHistory submissions={submissions} problemId={problemId} boardData={boardData} firstPlayer={firstPlayer} />
      )}

      {/* New Submission Form - Only if not correct yet */}
      {!isCorrect && !isExpired && (
        <SubmitForm problemId={problemId} boardData={boardData} firstPlayer={firstPlayer} />
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
