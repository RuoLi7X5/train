'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, Button, Label } from '@/components/ui'
import { CheckSquare, ChevronDown, ChevronUp, CheckCircle, XCircle, Clock, Save, History } from 'lucide-react'
import { applyMove, createEmptyBoard, type BoardPoint, type BoardState, type StoneColor } from '@/lib/go'
import { useToast } from '@/components/Toast'

type Submission = {
  id: number
  content: string | null
  imageUrl: string | null
  elapsedSeconds?: number | null
  isTimeout?: boolean | null
  status: 'PENDING' | 'CORRECT' | 'WRONG'
  feedback: string | null
  gradedAt?: string | null
  gradedBy?: {
    id: number
    username: string
    displayName: string | null
  } | null
  createdAt: string
  moves?: { x: number; y: number }[] | null
  user: {
    id: number
    username: string
    displayName: string | null
    class?: { name: string } | null
  }
  problem: {
    id: number
    date: string
    content: string
    boardData?: { size: number; stones: { x: number; y: number; color: 'B' | 'W' }[] } | null
    firstPlayer?: 'BLACK' | 'WHITE' | null
  }
}

// Grouped by User + Problem
type GroupedSubmission = {
  key: string // userId-problemId
  user: Submission['user']
  problem: Submission['problem']
  submissions: Submission[]
  latestStatus: string
}

type BoardStone = { x: number; y: number; color: 'B' | 'W' }
type BoardData = { size: number; stones: BoardStone[] }
type FirstPlayer = 'BLACK' | 'WHITE'

const formatDuration = (seconds?: number | null) => {
  if (seconds === null || seconds === undefined) return '-'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

const baseLetters = 'ABCDEFGHJKLMNOPQRST'.split('')

const toBoardState = (boardData?: BoardData | null) => {
  const size = boardData?.size || 19
  const board = createEmptyBoard(size)
  for (const s of boardData?.stones || []) {
    board[s.y][s.x] = s.color
  }
  return board
}

const colorAt = (index: number, firstPlayer?: FirstPlayer | null): StoneColor =>
  firstPlayer === 'WHITE' ? (index % 2 === 0 ? 'W' : 'B') : (index % 2 === 0 ? 'B' : 'W')

const buildBoardAtStep = (
  moves: { x: number; y: number }[] | null | undefined,
  step: number,
  boardData?: BoardData | null,
  firstPlayer?: FirstPlayer | null
) => {
  const size = boardData?.size || 19
  let board = toBoardState(boardData)
  let koPoint: BoardPoint | null = null
  const moveNumbers = new Map<string, number>()
  if (!moves || step <= 0) return { board, moveNumbers }
  const end = Math.min(step, moves.length)
  for (let i = 0; i < end; i += 1) {
    const m = moves[i]
    const color = colorAt(i, firstPlayer)
    const result = applyMove(board, m.x, m.y, color, koPoint)
    if (!result.legal) break
    const prev = board
    const next = result.board
    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        if (prev[y][x] && !next[y][x]) {
          moveNumbers.delete(`${x},${y}`)
        }
      }
    }
    board = next
    moveNumbers.set(`${m.x},${m.y}`, i + 1)
    koPoint = result.nextKoPoint
  }
  return { board, moveNumbers }
}

export default function SubmissionsPage() {
  const toast = useToast()
  const [groupedSubmissions, setGroupedSubmissions] = useState<GroupedSubmission[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'ALL' | 'PENDING'>('PENDING')
  const [expandedKey, setExpandedKey] = useState<string | null>(null)
  const [stepById, setStepById] = useState<Record<number, number>>({})
  
  // Grading state (mapped by submission ID)
  const [gradingState, setGradingState] = useState<Record<number, { status: 'CORRECT' | 'WRONG', feedback: string }>>({})
  const [savingId, setSavingId] = useState<number | null>(null)

  const fetchSubmissions = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/submissions?status=${filter}`)
      if (res.ok) {
        const data: Submission[] = await res.json()
        
        // Group submissions
        const groups: Record<string, GroupedSubmission> = {}
        data.forEach(sub => {
          const key = `${sub.user.id}-${sub.problem.id}`
          if (!groups[key]) {
            groups[key] = {
              key,
              user: sub.user,
              problem: sub.problem,
              submissions: [],
              latestStatus: 'PENDING'
            }
          }
          groups[key].submissions.push(sub)
        })

        // Determine status for group (if any is pending, show pending, else show latest)
        Object.values(groups).forEach(g => {
            // Sort desc
            g.submissions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            const hasPending = g.submissions.some(s => s.status === 'PENDING')
            g.latestStatus = hasPending ? 'PENDING' : g.submissions[0].status
        })

        const list = Object.values(groups)
        setGroupedSubmissions(list)
        const nextSteps: Record<number, number> = {}
        data.forEach(sub => {
          const moves = Array.isArray(sub.moves) ? sub.moves : null
          nextSteps[sub.id] = moves ? moves.length : 0
        })
        setStepById(prev => ({ ...nextSteps, ...prev }))
      }
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSubmissions()
  }, [filter])

  const handleExpand = (key: string) => {
    if (expandedKey === key) {
      setExpandedKey(null)
    } else {
      setExpandedKey(key)
    }
  }

  const initGradingState = (sub: Submission) => {
      if (!gradingState[sub.id]) {
          setGradingState(prev => ({
              ...prev,
              [sub.id]: {
                  status: sub.status === 'WRONG' ? 'WRONG' : 'CORRECT',
                  feedback: sub.feedback || ''
              }
          }))
      }
  }

  const updateGradingState = (id: number, field: 'status' | 'feedback', value: any) => {
      setGradingState(prev => ({
          ...prev,
          [id]: {
              ...prev[id],
              [field]: value
          }
      }))
  }

  const handleSave = async (id: number) => {
    const state = gradingState[id]
    if (!state) return

    setSavingId(id)
    try {
      const res = await fetch(`/api/submissions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: state.status, feedback: state.feedback }),
      })

      if (res.ok) {
        fetchSubmissions() // Refresh to update status
        toast.showSuccess('批改保存成功')
      } else {
        toast.showError('保存失败')
      }
    } catch (error) {
      toast.showError('保存失败')
    } finally {
      setSavingId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold tracking-tight text-gray-800">作业批改</h2>
        <div className="flex items-center gap-2 bg-white p-1 rounded-md border shadow-sm">
          <button
            onClick={() => setFilter('PENDING')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              filter === 'PENDING' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            待批改
          </button>
          <button
            onClick={() => setFilter('ALL')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              filter === 'ALL' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            全部
          </button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <CheckSquare className="w-5 h-5" />
            提交列表
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-gray-500">加载中...</div>
          ) : groupedSubmissions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">暂无相关提交</div>
          ) : (
            <div className="space-y-4">
              {groupedSubmissions.map((group) => (
                <div key={group.key} className="border rounded-lg overflow-hidden bg-white">
                  {/* Header Row */}
                  <div 
                    className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => handleExpand(group.key)}
                  >
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{group.user.displayName || group.user.username}</span>
                        {group.user.class && (
                            <span className="text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded border border-blue-100">
                                {group.user.class.name}
                            </span>
                        )}
                      </div>
                      <div className="text-gray-600 text-sm flex items-center">
                        {group.problem.date}
                      </div>
                      <div className="text-gray-500 text-sm flex items-center gap-1">
                        <History className="w-4 h-4" />
                        共 {group.submissions.length} 次提交
                      </div>
                      <div className="flex items-center">
                        {group.latestStatus === 'CORRECT' && <span className="flex items-center gap-1 text-green-600 text-sm font-medium"><CheckCircle className="w-4 h-4" /> 完成</span>}
                        {group.latestStatus === 'WRONG' && <span className="flex items-center gap-1 text-red-600 text-sm font-medium"><XCircle className="w-4 h-4" /> 错误</span>}
                        {group.latestStatus === 'PENDING' && <span className="flex items-center gap-1 text-yellow-600 text-sm font-medium"><Clock className="w-4 h-4" /> 待批改</span>}
                      </div>
                    </div>
                    <div>
                      {expandedKey === group.key ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                    </div>
                  </div>

                  {/* Expanded Content - List of Submissions */}
                  {expandedKey === group.key && (
                    <div className="border-t bg-gray-50 divide-y">
                        {group.submissions.map((sub, index) => {
                            // Initialize state for this item
                            initGradingState(sub)
                            const state = gradingState[sub.id] || { status: 'CORRECT', feedback: '' }
                            const moves = Array.isArray(sub.moves) ? sub.moves : []
                            const boardData = (sub.problem.boardData as BoardData | null | undefined) || null
                            const firstPlayer = (sub.problem.firstPlayer as FirstPlayer | null | undefined) || null
                            const totalSteps = moves.length
                            const currentStep = Math.min(stepById[sub.id] ?? totalSteps, totalSteps)
                            const replayReady = totalSteps > 0 && !!boardData

                            return (
                                <div key={sub.id} className="p-6 grid md:grid-cols-2 gap-6">
                                    {/* Student Answer */}
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm font-medium text-gray-500">
                                                提交 #{group.submissions.length - index} · {new Date(sub.createdAt).toLocaleString()}
                                            </span>
                                            <span className={`text-xs px-2 py-1 rounded-full ${
                                                sub.status === 'CORRECT' ? 'bg-green-100 text-green-700' :
                                                sub.status === 'WRONG' ? 'bg-red-100 text-red-700' :
                                                'bg-yellow-100 text-yellow-700'
                                            }`}>
                                                {sub.status === 'CORRECT' ? '正确' : sub.status === 'WRONG' ? '错误' : '待批改'}
                                            </span>
                                        </div>
                                        <div className="bg-white p-4 rounded-md border">
                                            <p className="whitespace-pre-wrap text-gray-800">{sub.content}</p>
                                            {sub.imageUrl && (
                                            <img src={sub.imageUrl} alt="Submission" className="mt-4 rounded-md border max-h-64 object-contain" />
                                            )}
                                        </div>
                                        <div className="flex flex-wrap gap-4 text-xs text-gray-600">
                                            <span>思考用时：{formatDuration(sub.elapsedSeconds)}</span>
                                            <span>超时：{sub.isTimeout ? '是' : '否'}</span>
                                            {sub.gradedAt && (
                                              <span>批改时间：{new Date(sub.gradedAt).toLocaleString()}</span>
                                            )}
                                            {sub.gradedBy && (
                                              <span>批改人：{sub.gradedBy.displayName || sub.gradedBy.username}</span>
                                            )}
                                        </div>
                                        {replayReady && (
                                          <div className="bg-white p-4 rounded-md border space-y-3">
                                            <div className="flex items-center justify-between">
                                              <div className="text-sm font-medium text-gray-700">落子过程</div>
                                              <div className="flex items-center gap-2">
                                                <Button
                                                  size="sm"
                                                  variant="outline"
                                                  disabled={currentStep <= 0}
                                                  onClick={() =>
                                                    setStepById(prev => ({
                                                      ...prev,
                                                      [sub.id]: Math.max(0, currentStep - 1)
                                                    }))
                                                  }
                                                >
                                                  上一步
                                                </Button>
                                                <Button
                                                  size="sm"
                                                  variant="outline"
                                                  disabled={currentStep >= totalSteps}
                                                  onClick={() =>
                                                    setStepById(prev => ({
                                                      ...prev,
                                                      [sub.id]: Math.min(totalSteps, currentStep + 1)
                                                    }))
                                                  }
                                                >
                                                  下一步
                                                </Button>
                                              </div>
                                            </div>
                                            <div className="text-xs text-gray-600">当前手数：{currentStep} / {totalSteps}</div>
                                            {(() => {
                                              const size = boardData.size
                                              const { board, moveNumbers } = buildBoardAtStep(moves, currentStep, boardData, firstPlayer)
                                              const cellSize = 18
                                              const stoneSize = 14
                                              const padding = stoneSize / 2
                                              const labelSize = 12
                                              const paddingLeft = labelSize + padding
                                              const paddingTop = labelSize + padding
                                              const paddingRight = padding
                                              const paddingBottom = padding
                                              const width = (size - 1) * cellSize
                                              const height = (size - 1) * cellSize
                                              const stones = []
                                              const labels = []
                                              for (let x = 0; x < size; x += 1) {
                                                labels.push(
                                                  <span
                                                    key={`col-${x}`}
                                                    className="absolute flex items-center justify-center text-[9px] text-black"
                                                    style={{
                                                      width: cellSize,
                                                      height: labelSize,
                                                      left: paddingLeft + x * cellSize - cellSize / 2,
                                                      top: 0
                                                    }}
                                                  >
                                                    {x + 1}
                                                  </span>
                                                )
                                              }
                                              for (let y = 0; y < size; y += 1) {
                                                labels.push(
                                                  <span
                                                    key={`row-${y}`}
                                                    className="absolute flex items-center justify-center text-[9px] text-black"
                                                    style={{
                                                      width: labelSize,
                                                      height: cellSize,
                                                      left: 0,
                                                      top: paddingTop + y * cellSize - cellSize / 2
                                                    }}
                                                  >
                                                    {baseLetters[y]}
                                                  </span>
                                                )
                                              }
                                              for (let y = 0; y < size; y += 1) {
                                                for (let x = 0; x < size; x += 1) {
                                                  const c = board[y][x]
                                                  if (!c) continue
                                                  const n = moveNumbers.get(`${x},${y}`)
                                                  const isBlack = c === 'B'
                                                  stones.push(
                                                    <span
                                                      key={`stone-${x}-${y}`}
                                                      className={`absolute rounded-full ${isBlack ? 'bg-black text-white' : 'bg-white border border-gray-400 text-black'} flex items-center justify-center`}
                                                      style={{
                                                        width: stoneSize,
                                                        height: stoneSize,
                                                        left: paddingLeft + x * cellSize - stoneSize / 2,
                                                        top: paddingTop + y * cellSize - stoneSize / 2,
                                                        fontSize: 9,
                                                        fontWeight: 600
                                                      }}
                                                    >
                                                      {n || ''}
                                                    </span>
                                                  )
                                                }
                                              }
                                              return (
                                                <div
                                                  className="relative inline-block bg-white border border-gray-200"
                                                  style={{
                                                    width: width + paddingLeft + paddingRight,
                                                    height: height + paddingTop + paddingBottom,
                                                    paddingLeft,
                                                    paddingTop,
                                                    paddingRight,
                                                    paddingBottom,
                                                    backgroundImage:
                                                      'linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)',
                                                    backgroundSize: `${cellSize}px ${cellSize}px`,
                                                    backgroundPosition: '0 0',
                                                    backgroundOrigin: 'content-box',
                                                    backgroundClip: 'content-box',
                                                  }}
                                                >
                                                  {labels}
                                                  {stones}
                                                </div>
                                              )
                                            })()}
                                          </div>
                                        )}
                                    </div>

                                    {/* Grading Form */}
                                    <div className="bg-white p-4 rounded-md border space-y-4 h-fit">
                                        <h4 className="font-medium text-gray-900 border-b pb-2">批改反馈</h4>
                                        
                                        <div className="flex gap-4">
                                            <button
                                            onClick={() => updateGradingState(sub.id, 'status', 'CORRECT')}
                                            className={`flex-1 py-2 rounded-md border flex items-center justify-center gap-2 transition-colors ${
                                                state.status === 'CORRECT' ? 'bg-green-100 border-green-500 text-green-700' : 'hover:bg-gray-50'
                                            }`}
                                            >
                                            <CheckCircle className="w-4 h-4" /> 正确
                                            </button>
                                            <button
                                            onClick={() => updateGradingState(sub.id, 'status', 'WRONG')}
                                            className={`flex-1 py-2 rounded-md border flex items-center justify-center gap-2 transition-colors ${
                                                state.status === 'WRONG' ? 'bg-red-100 border-red-500 text-red-700' : 'hover:bg-gray-50'
                                            }`}
                                            >
                                            <XCircle className="w-4 h-4" /> 错误
                                            </button>
                                        </div>

                                        <div className="space-y-2">
                                            <Label>评语 / 反馈</Label>
                                            <textarea
                                            className="flex min-h-[80px] w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                                            value={state.feedback}
                                            onChange={(e) => updateGradingState(sub.id, 'feedback', e.target.value)}
                                            placeholder="写点鼓励或纠正的话..."
                                            />
                                        </div>

                                        <Button className="w-full" onClick={() => handleSave(sub.id)} disabled={savingId === sub.id}>
                                            {savingId === sub.id ? '保存中...' : '保存批改结果'} <Save className="ml-2 w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
