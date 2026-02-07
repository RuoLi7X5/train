'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, Button } from '@/components/ui'
import { BookOpen, Calendar, ArrowRight, CheckCircle } from 'lucide-react'
import Link from 'next/link'

type StoneColor = 'B' | 'W'
type BoardStone = { x: number; y: number; color: StoneColor }
type BoardData = { size: number; stones: BoardStone[] }
type Viewport = { minX: number; maxX: number; minY: number; maxY: number }

type Problem = {
  id: number
  date: string
  content: string
  imageUrl: string | null
  boardData?: BoardData | null
  _count: {
    submissions: number
  }
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
  const cellSize = 18
  const stoneSize = 14
  const padding = stoneSize / 2
  const labelSize = 14
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
        className="absolute flex items-center justify-center text-[10px] text-black"
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
        className="absolute flex items-center justify-center text-[10px] text-black"
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
          width: 3,
          height: 3,
          left: paddingLeft + (p.x - viewport.minX) * cellSize - 1.5,
          top: paddingTop + (p.y - viewport.minY) * cellSize - 1.5
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

export default function ProblemsListPage() {
  const [problems, setProblems] = useState<Problem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/problems')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setProblems(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold tracking-tight text-gray-800">往期题目</h2>
      
      {loading ? (
        <div className="text-center py-12 text-gray-500">加载中...</div>
      ) : problems.length === 0 ? (
        <div className="text-center py-12 text-gray-500">暂无题目</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {problems.map(problem => (
            <Card key={problem.id} className="hover:shadow-md transition-shadow flex flex-col h-full">
              {problem.boardData ? (
                <div className="h-40 overflow-hidden border-b bg-gray-100 flex items-center justify-center">
                  {renderBoard(problem.boardData)}
                </div>
              ) : problem.imageUrl ? (
                <div className="h-40 overflow-hidden border-b bg-gray-100">
                  <img src={problem.imageUrl} alt="Problem" className="w-full h-full object-cover" />
                </div>
              ) : null}
              <CardContent className="p-5 flex-1 flex flex-col">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Calendar className="w-4 h-4" />
                    {problem.date}
                  </div>
                  {/* 这里可以优化：如果 API 返回了当前用户的完成状态，可以显示已完成标记 */}
                </div>
                <p className="text-gray-800 font-medium line-clamp-2 mb-4 flex-1">{problem.content}</p>
                <Link href={`/problem/${problem.id}`} className="mt-auto">
                  <Button variant="outline" className="w-full">
                    查看详情 <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
