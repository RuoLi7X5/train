'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui'
import { CheckCircle, XCircle, Clock, AlertCircle, Share2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui'
import { applyMove, createEmptyBoard, type BoardPoint, type BoardState, type StoneColor } from '@/lib/go'

type Submission = {
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

type BoardStone = { x: number; y: number; color: 'B' | 'W' }
type BoardData = { size: number; stones: BoardStone[] }
type FirstPlayer = 'BLACK' | 'WHITE'

const baseLetters = 'ABCDEFGHJKLMNOPQRST'.split('')
const coordOf = (x: number, y: number) => `${baseLetters[y]}${x + 1}`

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

export default function SubmissionHistory({
  submissions,
  problemId,
  boardData,
  firstPlayer
}: {
  submissions: Submission[]
  problemId: number
  boardData?: BoardData | null
  firstPlayer?: FirstPlayer | null
}) {
  const [sharingId, setSharingId] = useState<number | null>(null)
  const [trialOpen, setTrialOpen] = useState(false)
  const [trialBoard, setTrialBoard] = useState<BoardState>(() => toBoardState(boardData))
  const [trialKoPoint, setTrialKoPoint] = useState<BoardPoint | null>(null)
  const [trialNextColor, setTrialNextColor] = useState<StoneColor>(() => (firstPlayer === 'WHITE' ? 'W' : 'B'))
  const [trialMoveNumbers, setTrialMoveNumbers] = useState<Map<string, number>>(() => {
    const map = new Map<string, number>()
    for (const s of boardData?.stones || []) {
      map.set(`${s.x},${s.y}`, 0)
    }
    return map
  })
  const canTrial = !!boardData && submissions.some(s => (s.feedback || '').trim())
  const size = boardData?.size || 19

  const buildFinalBoard = (moves: { x: number; y: number }[] | null | undefined) => {
    const size = boardData?.size || 19
    let board = toBoardState(boardData)
    let koPoint: BoardPoint | null = null
    const moveNumbers = new Map<string, number>()
    if (!moves) return { board, moveNumbers }
    for (let i = 0; i < moves.length; i += 1) {
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

  const buildChains = (moves: { x: number; y: number }[] | null | undefined) => {
    if (!moves) return '无'
    const initial = new Set<string>()
    for (const s of boardData?.stones || []) initial.add(`${s.x},${s.y}`)
    const map = new Map<string, number[]>()
    moves.forEach((m, idx) => {
      const k = `${m.x},${m.y}`
      const arr = map.get(k) || []
      arr.push(idx + 1)
      map.set(k, arr)
    })
    const chains: string[] = []
    for (const [k, arr] of map) {
      if (arr.length <= 1) continue
      const [xStr, yStr] = k.split(',')
      const x = parseInt(xStr, 10)
      const y = parseInt(yStr, 10)
      const head = initial.has(k) ? coordOf(x, y) : String(arr[0])
      const tail = initial.has(k) ? arr : arr.slice(1)
      chains.push(`${head}=${tail.join('=')}`)
    }
    return chains.length ? chains.join('，') : '无'
  }

  const buildMoveNotations = (moves: { x: number; y: number }[] | null | undefined) => {
    if (!moves) return []
    const initial = new Set<string>()
    for (const s of boardData?.stones || []) initial.add(`${s.x},${s.y}`)
    const tokensByPos = new Map<string, string[]>()
    const notations: string[] = []
    moves.forEach((m, idx) => {
      const k = `${m.x},${m.y}`
      const tokens = tokensByPos.get(k)
      if (tokens) {
        tokens.push(String(idx + 1))
        notations.push(tokens.join('='))
        return
      }
      if (initial.has(k)) {
        const next = [coordOf(m.x, m.y), String(idx + 1)]
        tokensByPos.set(k, next)
        notations.push(next.join('='))
        return
      }
      const next = [String(idx + 1)]
      tokensByPos.set(k, next)
      notations.push(next.join('='))
    })
    return notations
  }

  const handleShare = async (sub: Submission) => {
    if (!confirm('确定要将此提交分享到讨论区吗？')) return

    setSharingId(sub.id)
    try {
      const content = `[分享我的解答]\n${sub.content || ''}`
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            problemId, 
            content, 
            imageUrl: sub.imageUrl 
        }),
      })

      if (res.ok) {
        alert('分享成功！')
        // Ideally reload comments, but page reload is simple
        window.location.reload()
      } else {
        alert('分享失败')
      }
    } catch (error) {
      alert('分享出错')
    } finally {
      setSharingId(null)
    }
  }

  const handleTrialClick = (x: number, y: number) => {
    const result = applyMove(trialBoard, x, y, trialNextColor, trialKoPoint)
    if (!result.legal) return
    const nextNumber = (Array.from(trialMoveNumbers.values()).reduce((a, b) => Math.max(a, b), 0) || 0) + 1
    const prev = trialBoard
    const next = result.board
    const newNums = new Map(trialMoveNumbers)
    for (let yy = 0; yy < size; yy += 1) {
      for (let xx = 0; xx < size; xx += 1) {
        if (prev[yy][xx] && !next[yy][xx]) {
          newNums.delete(`${xx},${yy}`)
        }
      }
    }
    newNums.set(`${x},${y}`, nextNumber)
    setTrialBoard(next)
    setTrialKoPoint(result.nextKoPoint)
    setTrialMoveNumbers(newNums)
    setTrialNextColor(trialNextColor === 'B' ? 'W' : 'B')
  }

  const resetTrial = () => {
    setTrialBoard(toBoardState(boardData))
    setTrialKoPoint(null)
    setTrialMoveNumbers(() => {
      const map = new Map<string, number>()
      for (const s of boardData?.stones || []) {
        map.set(`${s.x},${s.y}`, 0)
      }
      return map
    })
    setTrialNextColor(firstPlayer === 'WHITE' ? 'W' : 'B')
  }
  
  useEffect(() => {
    resetTrial()
    setTrialOpen(false)
  }, [boardData, firstPlayer])

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-xl">我的提交记录 ({submissions.length})</h3>
      {canTrial && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-gray-800">试下（收到老师反馈后解锁）</div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => setTrialOpen(v => !v)}>
                  {trialOpen ? '收起' : '展开试下'}
                </Button>
                <Button size="sm" variant="outline" onClick={resetTrial}>重置</Button>
              </div>
            </div>
            {trialOpen && boardData && (
              <div className="relative inline-block bg-white border border-gray-200">
                {(() => {
                  const cellSize = 22
                  const stoneSize = 18
                  const padding = stoneSize / 2
                  const labelSize = 14
                  const paddingLeft = labelSize + padding
                  const paddingTop = labelSize + padding
                  const paddingRight = padding
                  const paddingBottom = padding
                  const width = (size - 1) * cellSize
                  const height = (size - 1) * cellSize
                  const labels = []
                  const stones = []
                  const intersections = []
                  for (let x = 0; x < size; x += 1) {
                    labels.push(
                      <span
                        key={`col-${x}`}
                        className="absolute flex items-center justify-center text-[10px] text-black"
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
                        className="absolute flex items-center justify-center text-[10px] text-black"
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
                      intersections.push(
                        <button
                          key={`pt-${x}-${y}`}
                          type="button"
                          onClick={() => handleTrialClick(x, y)}
                          className="absolute"
                          style={{
                            width: cellSize,
                            height: cellSize,
                            left: paddingLeft + x * cellSize - cellSize / 2,
                            top: paddingTop + y * cellSize - cellSize / 2,
                          }}
                        />
                      )
                      const c = trialBoard[y][x]
                      if (!c) continue
                      const n = trialMoveNumbers.get(`${x},${y}`)
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
                            fontSize: 10,
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
                      {intersections}
                      {stones}
                    </div>
                  )
                })()}
              </div>
            )}
          </CardContent>
        </Card>
      )}
      <div className="space-y-6">
        {submissions.map((sub, index) => (
          <Card key={sub.id}>
            <div className="bg-gray-50 px-4 py-2 border-b text-sm text-gray-500 flex justify-between items-center">
              <span>提交 #{submissions.length - index} · {new Date(sub.createdAt).toLocaleString()}</span>
              <div className="flex items-center gap-3">
                <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-6 px-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                    onClick={() => handleShare(sub)}
                    disabled={sharingId === sub.id}
                >
                    {sharingId === sub.id ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Share2 className="w-3 h-3 mr-1" />}
                    分享
                </Button>
                <div className="flex items-center gap-1">
                  {sub.status === 'CORRECT' && <span className="text-green-600 flex items-center gap-1"><CheckCircle className="w-3 h-3"/> 正确</span>}
                  {sub.status === 'WRONG' && <span className="text-red-600 flex items-center gap-1"><XCircle className="w-3 h-3"/> 错误</span>}
                  {sub.status === 'PENDING' && <span className="text-yellow-600 flex items-center gap-1"><Clock className="w-3 h-3"/> 待批改</span>}
                </div>
              </div>
            </div>
            <CardContent className="p-6 space-y-4">
                <div className="space-y-2">
                  {sub.content && <p className="text-gray-800 whitespace-pre-wrap">{sub.content}</p>}
                  {sub.imageUrl && (
                    <div className="mt-2 rounded-lg overflow-hidden border border-gray-200 w-fit">
                      <img 
                        src={sub.imageUrl} 
                        alt="Submission" 
                        className="max-w-full h-auto max-h-64" 
                        suppressHydrationWarning
                      />
                    </div>
                  )}
                </div>

                {Array.isArray(sub.moves) && sub.moves.length > 0 && boardData && (
                  <div className="mt-3 space-y-3">
                    <div className="text-sm font-semibold text-gray-800">落子记录（坐标）</div>
                    <div className="text-xs text-gray-700 break-words">
                      {sub.moves.map((m, idx) => (
                        <span key={`m-${idx}`} className="inline-block mr-2">
                          {idx + 1}. {coordOf(m.x, m.y)}
                        </span>
                      ))}
                    </div>
                    <div className="text-sm font-semibold text-gray-800">落子记录（规则表达）</div>
                    <div className="text-xs text-gray-700 break-words">
                      {buildMoveNotations(sub.moves).map((t, idx) => (
                        <span key={`n-${idx}`} className="inline-block mr-2">
                          {t}
                        </span>
                      ))}
                    </div>
                    <div className="text-xs text-gray-700">重复落点链：{buildChains(sub.moves)}</div>
                    {(() => {
                      const size = boardData.size
                      const { board, moveNumbers } = buildFinalBoard(sub.moves)
                      const cellSize = 20
                      const stoneSize = 16
                      const padding = stoneSize / 2
                      const labelSize = 14
                      const paddingLeft = labelSize + padding
                      const paddingTop = labelSize + padding
                      const paddingRight = padding
                      const paddingBottom = padding
                      const width = (size - 1) * cellSize
                      const height = (size - 1) * cellSize
                      const stones = []
                      const labels = []
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
                                fontSize: 10,
                                fontWeight: 600
                              }}
                            >
                              {n || ''}
                            </span>
                          )
                        }
                      }
                      for (let x = 0; x < size; x += 1) {
                        labels.push(
                          <span
                            key={`col-${x}`}
                            className="absolute flex items-center justify-center text-[10px] text-black"
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
                            className="absolute flex items-center justify-center text-[10px] text-black"
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

                {(sub.feedback) && (
                  <div className={`mt-4 p-3 rounded-md text-sm ${
                    sub.status === 'CORRECT' ? 'bg-green-50 border border-green-200 text-green-800' :
                    sub.status === 'WRONG' ? 'bg-red-50 border border-red-200 text-red-800' :
                    'bg-gray-100 border border-gray-200 text-gray-800'
                  }`}>
                    <div className="font-semibold mb-1 flex items-center gap-2">
                      <AlertCircle className="w-3 h-3" /> 老师反馈
                    </div>
                    {sub.feedback}
                  </div>
                )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
