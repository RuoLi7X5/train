'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Label, Input, Card, CardContent } from '@/components/ui'
import { Upload, Loader2 } from 'lucide-react'
import { applyMove, createEmptyBoard, type BoardPoint, type BoardState, type StoneColor } from '@/lib/go'
import { useToast } from '@/components/Toast'

type BoardStone = { x: number; y: number; color: StoneColor }
type BoardData = { size: number; stones: BoardStone[] }
type FirstPlayer = 'BLACK' | 'WHITE'

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

type Viewport = { minX: number; maxX: number; minY: number; maxY: number }

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

const toBoardState = (boardData?: BoardData | null) => {
  const size = boardData?.size || 19
  const board = createEmptyBoard(size)
  for (const s of boardData?.stones || []) {
    board[s.y][s.x] = s.color
  }
  return board
}

export default function SubmitForm({
  problemId,
  boardData,
  firstPlayer
}: {
  problemId: number
  boardData?: BoardData | null
  firstPlayer?: FirstPlayer | null
}) {
  const toast = useToast()
  const [content, setContent] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [moveError, setMoveError] = useState('')
  const [moves, setMoves] = useState<BoardPoint[]>([])
  const [boardState, setBoardState] = useState<BoardState>(() => toBoardState(boardData))
  const [nextColor, setNextColor] = useState<StoneColor>(() => (firstPlayer === 'WHITE' ? 'W' : 'B'))
  const [koPoint, setKoPoint] = useState<BoardPoint | null>(null)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [intervalFailed, setIntervalFailed] = useState(false)
  const lastMoveAtRef = useRef<number | null>(null)
  const startTimeRef = useRef<number>(Date.now())
  const router = useRouter()
  const [ephemeral, setEphemeral] = useState<Array<{ id: number; x: number; y: number; color: StoneColor; n: number }>>([])

  useEffect(() => {
    setBoardState(toBoardState(boardData))
    setNextColor(firstPlayer === 'WHITE' ? 'W' : 'B')
    setKoPoint(null)
    setMoves([])
    setMoveError('')
    setIntervalFailed(false)
    lastMoveAtRef.current = null
    startTimeRef.current = Date.now()
    setElapsedSeconds(0)
    setEphemeral([])
  }, [boardData, firstPlayer])

  useEffect(() => {
    startTimeRef.current = Date.now()
    setElapsedSeconds(0)
    const id = window.setInterval(() => {
      const seconds = Math.floor((Date.now() - startTimeRef.current) / 1000)
      setElapsedSeconds(seconds)
    }, 1000)
    return () => window.clearInterval(id)
  }, [problemId])

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const handleBoardClick = (x: number, y: number) => {
    if (!boardData) return
    if (intervalFailed) return
    const now = Date.now()
    if (lastMoveAtRef.current && now - lastMoveAtRef.current > 5000) {
      setIntervalFailed(true)
      setMoveError('落子间隔超过5秒，已判定失败')
      return
    }
    const result = applyMove(boardState, x, y, nextColor, koPoint)
    if (!result.legal) {
      const errorMap: Record<string, string> = {
        OUT_OF_RANGE: '落子超出棋盘范围',
        OCCUPIED: '该位置已有棋子',
        KO: '打劫禁止：请在别处落子',
        SUICIDE: '此处为自杀禁着',
      }
      setMoveError(errorMap[result.error || ''] || '落子不合法')
      return
    }
    setMoveError('')
    setBoardState(result.board)
    setKoPoint(result.nextKoPoint)
    const moveNumber = moves.length + 1
    setMoves((prev) => [...prev, { x, y }])
    const id = Date.now() + Math.random()
    setEphemeral((prev) => [...prev, { id, x, y, color: nextColor, n: moveNumber }])
    window.setTimeout(() => {
      setEphemeral((prev) => prev.filter((e) => e.id !== id))
    }, 500)
    setNextColor(nextColor === 'B' ? 'W' : 'B')
    lastMoveAtRef.current = now
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return
    
    setUploading(true)
    const file = e.target.files[0]
    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()
      if (data.success) {
        setImageUrl(data.url)
      } else {
        toast.showError('图片上传失败')
      }
    } catch (error) {
      toast.showError('图片上传出错')
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content && !imageUrl && moves.length === 0) {
        toast.showWarning('请至少填写文字或上传图片')
        return
    }
    
    setSubmitting(true)

    try {
      const res = await fetch('/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problemId,
          content,
          imageUrl,
          moves: moves.length ? moves : undefined,
          elapsedSeconds,
          isTimeout: intervalFailed
        }),
      })

      if (res.ok) {
        toast.showSuccess('提交成功')
        router.refresh()
      } else {
        toast.showError('提交失败')
      }
    } catch (error) {
      toast.showError('提交失败')
    } finally {
      setSubmitting(false)
    }
  }

  const renderBlindBoard = () => {
    if (!boardData) return null
    const size = boardData.size || 19
    const viewport = computeViewport({ size, stones: boardData.stones || [] })
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
    const intersections = []
    const stones = []
    const labels = []
    const starPoints = []
    const letters = getLetters(size)
    const stars = getStarPoints(size)
    for (let y = viewport.minY; y <= viewport.maxY; y += 1) {
      for (let x = viewport.minX; x <= viewport.maxX; x += 1) {
        intersections.push(
          <button
            key={`pt-${x}-${y}`}
            type="button"
            onClick={() => handleBoardClick(x, y)}
            className="absolute"
            style={{
              width: cellSize,
              height: cellSize,
              left: paddingLeft + (x - viewport.minX) * cellSize - cellSize / 2,
              top: paddingTop + (y - viewport.minY) * cellSize - cellSize / 2,
            }}
          />
        )
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
    for (const e of ephemeral) {
      if (e.x < viewport.minX || e.x > viewport.maxX || e.y < viewport.minY || e.y > viewport.maxY) continue
      const isBlack = e.color === 'B'
      stones.push(
        <span
          key={`ephemeral-${e.id}`}
          className={`absolute rounded-full ${isBlack ? 'bg-black text-white' : 'bg-white border border-gray-400 text-black'} flex items-center justify-center`}
          style={{
            width: stoneSize,
            height: stoneSize,
            left: paddingLeft + (e.x - viewport.minX) * cellSize - stoneSize / 2,
            top: paddingTop + (e.y - viewport.minY) * cellSize - stoneSize / 2,
            pointerEvents: 'none',
            fontSize: 12,
            fontWeight: 600
          }}
        >
          {e.n}
        </span>
      )
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
        {intersections}
        {stones}
      </div>
    )
  }

  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        <h3 className="font-semibold text-lg">提交解答</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          {boardData && (
            <div className="space-y-2">
              <Label>盲棋落子</Label>
              <div className="flex items-start gap-4 flex-wrap">
                {renderBlindBoard()}
                <div className="min-w-[220px] border border-gray-200 rounded-md p-3 text-sm text-gray-700 space-y-3">
                  <div className="flex items-center justify-between">
                    <span>用时</span>
                    <span className="font-semibold">{formatDuration(elapsedSeconds)}</span>
                  </div>
                  <div>已记录手数：{moves.length}</div>
                  <div>下一手：{nextColor === 'B' ? '黑' : '白'}</div>
                  {moveError && <div className="text-red-600">{moveError}</div>}
                  {intervalFailed && <div className="text-red-600">本次已超时，提交将标记为超时</div>}
                  <div className="border-t pt-2 space-y-1 text-gray-600">
                    <div>思考不限时间，思考完整后开始落子。</div>
                    <div>落子间隔不得超过5秒，否则视为失败。</div>
                  </div>
                </div>
              </div>
            </div>
          )}
          <div className="space-y-2">
            <Label>文字解答 / 备注</Label>
            <textarea 
              className="flex min-h-[100px] w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="在这里输入你的解题思路..."
            />
          </div>

          <div className="space-y-2">
            <Label>上传图片 (支持解答拍照)</Label>
            <div className="flex items-center gap-2">
              <Input 
                type="file" 
                accept="image/*"
                onChange={handleImageUpload}
                disabled={uploading}
              />
              {uploading && <Loader2 className="animate-spin w-4 h-4" />}
            </div>
            {imageUrl && (
              <div className="mt-2 rounded-md overflow-hidden border border-gray-200 w-fit">
                <img src={imageUrl} alt="Preview" className="max-w-full h-auto max-h-64" />
              </div>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={submitting || uploading}>
            {submitting ? <Loader2 className="animate-spin mr-2" /> : null}
            提交作业
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
