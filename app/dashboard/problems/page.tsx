'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, Input, Button, Label } from '@/components/ui'
import { BookOpen, Upload, Loader2, Image as ImageIcon, ChevronLeft, ChevronRight } from 'lucide-react'
import { applyMove, cloneBoard, createEmptyBoard, type BoardState, type StoneColor, type BoardPoint } from '@/lib/go'
import { useToast } from '@/components/Toast'

type Problem = {
  id: number
  date: string
  content: string
  imageUrl: string | null
  _count: {
    submissions: number
  }
}

type PlacementMode = 'BLACK_ONLY' | 'WHITE_ONLY' | 'ALTERNATE'
type FirstPlayer = 'BLACK' | 'WHITE'
type ClassData = { id: number; name: string }
type StudentData = { id: number; username: string; displayName: string | null; classId: number | null }

export default function ProblemsPage() {
  const toast = useToast()
  const [problems, setProblems] = useState<Problem[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [uploading, setUploading] = useState(false)

  const [publishAt, setPublishAt] = useState(() => {
    const now = new Date()
    return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
  })
  const [content, setContent] = useState('')
  const [imageUrl, setImageUrl] = useState('')

  // Answer state
  const [answerContent, setAnswerContent] = useState('')
  const [answerImageUrl, setAnswerImageUrl] = useState('')
  const [answerReleaseHours, setAnswerReleaseHours] = useState(24)

  // Push settings - 班级和学生推送
  const [classes, setClasses] = useState<ClassData[]>([])
  const [students, setStudents] = useState<StudentData[]>([])
  const [pushToStudents, setPushToStudents] = useState(false)
  const [selectedClasses, setSelectedClasses] = useState<number[]>([])
  const [selectedStudents, setSelectedStudents] = useState<number[]>([])
  const [pushDueAt, setPushDueAt] = useState('')
  const boardSize = 19
  const [placementMode, setPlacementMode] = useState<PlacementMode>('ALTERNATE')
  const [firstPlayer, setFirstPlayer] = useState<FirstPlayer>('BLACK')
  const [setupBoard, setSetupBoard] = useState<BoardState>(() => createEmptyBoard(boardSize))
  const [setupNextColor, setSetupNextColor] = useState<StoneColor>('B')
  const [trialMode, setTrialMode] = useState(false)
  const [trialBoard, setTrialBoard] = useState<BoardState>(() => createEmptyBoard(boardSize))
  const [trialNextColor, setTrialNextColor] = useState<StoneColor>('B')
  const [trialMoves, setTrialMoves] = useState<BoardPoint[]>([])
  const [trialKoPoint, setTrialKoPoint] = useState<BoardPoint | null>(null)
  const [trialError, setTrialError] = useState('')
  const [isHistoryOpen, setIsHistoryOpen] = useState(true)
  const [isDraftsExpanded, setIsDraftsExpanded] = useState(true)
  const [isPublishedExpanded, setIsPublishedExpanded] = useState(true)

  const fetchProblems = async () => {
    try {
      const res = await fetch('/api/problems')
      if (res.ok) {
        const data = await res.json()
        setProblems(data)
      }
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProblems()
    fetchClassesAndStudents()
  }, [])

  const fetchClassesAndStudents = async () => {
    try {
      // 获取教练的班级列表
      const classesRes = await fetch('/api/classes')
      if (classesRes.ok) {
        const classesData = await classesRes.json()
        setClasses(classesData)
      }

      // 获取教练的学生列表
      const studentsRes = await fetch('/api/users')
      if (studentsRes.ok) {
        const usersData = await studentsRes.json()
        setStudents(usersData.filter((u: any) => u.role === 'STUDENT'))
      }
    } catch (error) {
      console.error('Failed to fetch classes and students:', error)
    }
  }

  useEffect(() => {
    setSetupNextColor('B')
  }, [placementMode])

  const boardToStones = (board: BoardState) => {
    const stones: { x: number; y: number; color: StoneColor }[] = []
    for (let y = 0; y < board.length; y += 1) {
      for (let x = 0; x < board[y].length; x += 1) {
        const c = board[y][x]
        if (c) stones.push({ x, y, color: c })
      }
    }
    return stones
  }

  const boardData = useMemo(() => {
    const stones = boardToStones(setupBoard)
    return { size: boardSize, stones }
  }, [setupBoard])

  // 分类题目：草稿和已发布
  const { drafts, published } = useMemo(() => {
    const drafts = problems.filter((p: any) => p.isDraft === true)
    const published = problems.filter((p: any) => p.isDraft !== true)
    return { drafts, published }
  }, [problems])

  const getPlacementColor = () => {
    if (placementMode === 'BLACK_ONLY') return 'B'
    if (placementMode === 'WHITE_ONLY') return 'W'
    return setupNextColor
  }

  const toggleColor = (color: StoneColor) => (color === 'B' ? 'W' : 'B')

  const handleSetupPlace = (x: number, y: number, overrideColor?: StoneColor) => {
    if (trialMode) return
    setTrialError('')
    setSetupBoard((prev) => {
      const next = cloneBoard(prev)
      if (next[y][x]) {
        next[y][x] = null
        return next
      }
      const color = overrideColor ?? getPlacementColor()
      next[y][x] = color
      if (placementMode === 'ALTERNATE' && !overrideColor) {
        setSetupNextColor(toggleColor(color))
      }
      return next
    })
  }

  const handleSetupClick = (x: number, y: number) => {
    handleSetupPlace(x, y)
  }

  const handleSetupSecondaryClick = (x: number, y: number) => {
    if (placementMode === 'ALTERNATE') {
      handleSetupPlace(x, y)
      return
    }
    handleSetupPlace(x, y, toggleColor(getPlacementColor()))
  }

  const startTrial = () => {
    setTrialMode(true)
    setTrialBoard(cloneBoard(setupBoard))
    const nextColor = firstPlayer === 'BLACK' ? 'B' : 'W'
    setTrialNextColor(nextColor)
    setTrialMoves([])
    setTrialKoPoint(null)
    setTrialError('')
  }

  const exitTrial = () => {
    setTrialMode(false)
    setTrialBoard(cloneBoard(setupBoard))
    setTrialMoves([])
    setTrialKoPoint(null)
    setTrialError('')
  }

  const handleTrialClick = (x: number, y: number) => {
    if (!trialMode) return
    const result = applyMove(trialBoard, x, y, trialNextColor, trialKoPoint)
    if (!result.legal) {
      const errorMap: Record<string, string> = {
        OUT_OF_RANGE: '落子超出棋盘范围',
        OCCUPIED: '该位置已有棋子',
        KO: '打劫禁止：请在别处落子',
        SUICIDE: '此处为自杀禁着',
      }
      setTrialError(errorMap[result.error || ''] || '落子不合法')
      return
    }
    setTrialError('')
    setTrialBoard(result.board)
    setTrialKoPoint(result.nextKoPoint)
    setTrialMoves((prev) => [...prev, { x, y }])
    setTrialNextColor(toggleColor(trialNextColor))
  }

  const clearSetupBoard = () => {
    if (trialMode) return
    setSetupBoard(createEmptyBoard(boardSize))
    setSetupNextColor('B')
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

  const renderBoardEditor = (
    board: BoardState,
    onPointClick: (x: number, y: number) => void,
    onPointSecondaryClick?: (x: number, y: number) => void
  ) => {
    const cellSize = 26
    const stoneSize = 20
    const padding = stoneSize / 2
    const labelSize = 18
    const paddingLeft = labelSize + padding
    const paddingTop = labelSize + padding
    const paddingRight = padding
    const paddingBottom = padding
    const width = (boardSize - 1) * cellSize
    const height = (boardSize - 1) * cellSize
    const intersections = []
    const stones = []
    const labels = []
    const starPoints = []
    const letters = getLetters(boardSize)
    const stars = getStarPoints(boardSize)
    for (let y = 0; y < boardSize; y += 1) {
      for (let x = 0; x < boardSize; x += 1) {
        intersections.push(
          <button
            key={`pt-${x}-${y}`}
            type="button"
            onClick={() => onPointClick(x, y)}
            onContextMenu={(e) => {
              e.preventDefault()
              if (onPointSecondaryClick) onPointSecondaryClick(x, y)
            }}
            className="absolute"
            style={{
              width: cellSize,
              height: cellSize,
              left: paddingLeft + x * cellSize - cellSize / 2,
              top: paddingTop + y * cellSize - cellSize / 2,
            }}
          />
        )
        const c = board[y][x]
        if (!c) continue
        stones.push(
          <span
            key={`stone-${x}-${y}`}
            className={`absolute rounded-full ${c === 'B' ? 'bg-black' : 'bg-white border border-gray-400'}`}
            style={{
              width: stoneSize,
              height: stoneSize,
              left: paddingLeft + x * cellSize - stoneSize / 2,
              top: paddingTop + y * cellSize - stoneSize / 2,
              pointerEvents: 'none'
            }}
          />
        )
      }
    }
    for (let x = 0; x < boardSize; x += 1) {
      labels.push(
        <span
          key={`col-${x}`}
          className="absolute flex items-center justify-center text-[11px] text-black"
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
    for (let y = 0; y < boardSize; y += 1) {
      labels.push(
        <span
          key={`row-${y}`}
          className="absolute flex items-center justify-center text-[11px] text-black"
          style={{
            width: labelSize,
            height: cellSize,
            left: 0,
            top: paddingTop + y * cellSize - cellSize / 2
          }}
        >
          {letters[y]}
        </span>
      )
    }
    for (const p of stars) {
      starPoints.push(
        <span
          key={`star-${p.x}-${p.y}`}
          className="absolute rounded-full bg-black"
          style={{
            width: 4,
            height: 4,
            left: paddingLeft + p.x * cellSize - 2,
            top: paddingTop + p.y * cellSize - 2
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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'problem' | 'answer') => {
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
        if (type === 'problem') setImageUrl(data.url)
        else setAnswerImageUrl(data.url)
      } else {
        toast.showError('图片上传失败')
      }
    } catch (error) {
      toast.showError('图片上传出错')
    } finally {
      setUploading(false)
    }
  }

  // 重置表单
  const resetForm = () => {
    setContent('')
    setImageUrl('')
    setAnswerContent('')
    setAnswerImageUrl('')
    setPushToStudents(false)
    setSelectedClasses([])
    setSelectedStudents([])
    setPushDueAt('')
    setTrialMode(false)
    setTrialError('')
    setTrialKoPoint(null)
    setTrialMoves([])
    setSetupBoard(createEmptyBoard(boardSize))
  }

  // 保存为草稿
  const handleSaveDraft = async () => {
    if (!content.trim()) {
      toast.showWarning('请填写题目内容')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/problems', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          publishAt: new Date(publishAt).toISOString(),
          content,
          imageUrl,
          answerContent,
          answerImageUrl,
          answerReleaseHours,
          isDraft: true,
          boardData,
          placementMode,
          firstPlayer,
          answerMoves: trialMoves.length ? trialMoves : null
        }),
      })

      if (res.ok) {
        fetchProblems()
        resetForm()
        toast.showSuccess('草稿保存成功')
      } else {
        const data = await res.json()
        toast.showError(data.message || '保存失败')
      }
    } catch (error) {
      toast.showError('保存失败')
    } finally {
      setSubmitting(false)
    }
  }

  // 发布题目
  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!content.trim()) {
      toast.showWarning('请填写题目内容')
      return
    }

    if (pushToStudents) {
      if (!pushDueAt) {
        toast.showWarning('请设置推送截止时间')
        return
      }
      if (selectedClasses.length === 0 && selectedStudents.length === 0) {
        toast.showWarning('请选择要推送的班级或学生')
        return
      }
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/problems', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          publishAt: new Date(publishAt).toISOString(),
          content,
          imageUrl,
          answerContent,
          answerImageUrl,
          answerReleaseHours,
          isDraft: false,
          pushToStudents,
          selectedClasses,
          selectedStudents,
          pushDueAt: pushDueAt ? new Date(pushDueAt).toISOString() : undefined,
          boardData,
          placementMode,
          firstPlayer,
          answerMoves: trialMoves.length ? trialMoves : null
        }),
      })

      if (res.ok) {
        fetchProblems()
        resetForm()
        toast.showSuccess('题目发布成功！')
      } else {
        const data = await res.json()
        toast.showError(data.message || '发布失败')
      }
    } catch (error) {
      toast.showError('发布失败')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold tracking-tight text-gray-800">每日一题管理</h2>

      <div className="relative">
        {!isHistoryOpen && (
          <button
            type="button"
            onClick={() => setIsHistoryOpen(true)}
            className="absolute top-0 right-0 h-full w-7 flex items-center justify-center bg-white border border-gray-200 rounded-l-full shadow-md hover:bg-gray-50"
            aria-label="展开历史题目"
          >
            <ChevronLeft className="h-4 w-4 text-gray-500" />
          </button>
        )}
        <div className={`grid gap-6 ${isHistoryOpen ? 'md:grid-cols-3' : 'md:grid-cols-1'}`}>
        {/* Create Problem Form */}
        <Card className={isHistoryOpen ? 'md:col-span-1 h-fit' : 'md:col-span-1'}>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              发布新题目
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePublish} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="publishAt">题目发布时间</Label>
                <Input
                  id="publishAt"
                  type="datetime-local"
                  value={publishAt}
                  onChange={(e) => setPublishAt(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="content">题目内容</Label>
                <textarea
                  id="content"
                  className="flex min-h-[100px] w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 disabled:cursor-not-allowed disabled:opacity-50"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="输入题目描述..."
                  required
                />
              </div>
              <div className="space-y-3">
                <Label>出题棋盘</Label>
                <div className="flex items-center gap-2">
                  <select
                    className="h-9 rounded-md border border-gray-300 bg-white px-2 text-sm"
                    value={placementMode}
                    onChange={(e) => setPlacementMode(e.target.value as PlacementMode)}
                    disabled={trialMode}
                  >
                    <option value="BLACK_ONLY">连续黑棋</option>
                    <option value="WHITE_ONLY">连续白棋</option>
                    <option value="ALTERNATE">黑白交替</option>
                  </select>
                  <select
                    className="h-9 rounded-md border border-gray-300 bg-white px-2 text-sm"
                    value={firstPlayer}
                    onChange={(e) => setFirstPlayer(e.target.value as FirstPlayer)}
                    disabled={trialMode}
                  >
                    <option value="BLACK">黑先</option>
                    <option value="WHITE">白先</option>
                  </select>
                  {trialMode ? (
                    <Button type="button" variant="outline" size="sm" onClick={exitTrial}>
                      返回摆题
                    </Button>
                  ) : (
                    <Button type="button" variant="outline" size="sm" onClick={startTrial}>
                      进入试下
                    </Button>
                  )}
                  <Button type="button" variant="outline" size="sm" onClick={clearSetupBoard} disabled={trialMode}>
                    清空棋盘
                  </Button>
                </div>
                {trialMode && (
                  <div className="text-sm text-gray-600">
                    试下模式：当前轮到{trialNextColor === 'B' ? '黑' : '白'}落子
                  </div>
                )}
                {trialError && (
                  <div className="text-sm text-red-600">{trialError}</div>
                )}
                <div className="max-w-full overflow-x-auto">
                  {renderBoardEditor(
                    trialMode ? trialBoard : setupBoard,
                    (x, y) => (trialMode ? handleTrialClick(x, y) : handleSetupClick(x, y)),
                    trialMode ? undefined : handleSetupSecondaryClick
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label>题目图片 (可选)</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="image"
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageUpload(e, 'problem')}
                    disabled={uploading}
                    className="cursor-pointer"
                  />
                  {uploading && <Loader2 className="animate-spin w-4 h-4" />}
                </div>
                {imageUrl && (
                  <div className="relative mt-2 rounded-md overflow-hidden border border-gray-200">
                    <img src={imageUrl} alt="Preview" className="w-full object-cover max-h-40" />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute top-1 right-1 bg-white/80 hover:bg-white text-red-600 h-6 w-6 p-0 rounded-full"
                      onClick={() => setImageUrl('')}
                    >
                      ×
                    </Button>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-gray-200">
                <h4 className="font-medium mb-3 text-gray-700">官方答案 (可选)</h4>
                <div className="space-y-2">
                  <Label htmlFor="answerReleaseHours">答案发布时间</Label>
                  <select
                    id="answerReleaseHours"
                    className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                    value={answerReleaseHours}
                    onChange={(e) => setAnswerReleaseHours(Number(e.target.value))}
                  >
                    <option value={24}>24 小时后</option>
                    {Array.from({ length: 12 }).map((_, i) => (
                      <option key={i + 1} value={i + 1}>
                        {i + 1} 小时后
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2 mt-2">
                  <Label htmlFor="answerContent">答案解析</Label>
                  <textarea
                    id="answerContent"
                    className="flex min-h-[80px] w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                    value={answerContent}
                    onChange={(e) => setAnswerContent(e.target.value)}
                    placeholder="输入答案解析..."
                  />
                </div>
                <div className="space-y-2 mt-2">
                  <Label>答案图片</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload(e, 'answer')}
                      disabled={uploading}
                      className="cursor-pointer"
                    />
                  </div>
                  {answerImageUrl && (
                    <div className="relative mt-2 rounded-md overflow-hidden border border-gray-200">
                      <img src={answerImageUrl} alt="Answer Preview" className="w-full object-cover max-h-40" />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute top-1 right-1 bg-white/80 hover:bg-white text-red-600 h-6 w-6 p-0 rounded-full"
                        onClick={() => setAnswerImageUrl('')}
                      >
                        ×
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200 space-y-4">
                {/* 推送设置 */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-gray-900">推送设置（可选）</h4>
                    <label className="flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={pushToStudents}
                        onChange={(e) => setPushToStudents(e.target.checked)}
                      />
                      启用推送到学生
                    </label>
                  </div>
                  
                  {pushToStudents && (
                    <div className="space-y-4 pl-4 border-l-2 border-blue-200">
                      {/* 班级选择 */}
                      {classes.length > 0 && (
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">选择班级</Label>
                          <div className="space-y-1 max-h-32 overflow-y-auto border border-gray-200 rounded-md p-2">
                            {classes.map((cls) => (
                              <label key={cls.id} className="flex items-center gap-2 text-sm hover:bg-gray-50 p-1 rounded">
                                <input
                                  type="checkbox"
                                  checked={selectedClasses.includes(cls.id)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedClasses([...selectedClasses, cls.id])
                                    } else {
                                      setSelectedClasses(selectedClasses.filter(id => id !== cls.id))
                                    }
                                  }}
                                />
                                {cls.name}
                              </label>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 学生选择 */}
                      {students.length > 0 && (
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">选择学生</Label>
                          <div className="space-y-1 max-h-48 overflow-y-auto border border-gray-200 rounded-md p-2">
                            {students.map((student) => (
                              <label key={student.id} className="flex items-center gap-2 text-sm hover:bg-gray-50 p-1 rounded">
                                <input
                                  type="checkbox"
                                  checked={selectedStudents.includes(student.id)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedStudents([...selectedStudents, student.id])
                                    } else {
                                      setSelectedStudents(selectedStudents.filter(id => id !== student.id))
                                    }
                                  }}
                                />
                                {student.displayName || student.username}
                                {student.classId && (
                                  <span className="text-xs text-gray-500">
                                    ({classes.find(c => c.id === student.classId)?.name})
                                  </span>
                                )}
                              </label>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 截止时间 */}
                      <div className="space-y-2">
                        <Label htmlFor="pushDueAt">推送截止时间 *</Label>
                        <Input
                          id="pushDueAt"
                          type="datetime-local"
                          value={pushDueAt}
                          onChange={(e) => setPushDueAt(e.target.value)}
                          required
                        />
                        <p className="text-xs text-gray-500">学生需要在此时间前完成打卡</p>
                      </div>

                      <p className="text-xs text-blue-600 bg-blue-50 p-2 rounded">
                        💡 已选择 {selectedClasses.length} 个班级和 {selectedStudents.length} 位学生
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* 操作按钮 */}
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  disabled={submitting}
                  onClick={handleSaveDraft}
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : '保存为草稿'}
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={submitting}
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : '发布题目'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Problems List - 草稿箱和历史题目 */}
        {isHistoryOpen && (
          <Card className="md:col-span-2 relative z-10 bg-white">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <BookOpen className="w-5 h-5" />
                  我的题目
                </CardTitle>
                <button
                  type="button"
                  onClick={() => setIsHistoryOpen(false)}
                  className="h-7 w-7 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50"
                  aria-label="收起题目列表"
                >
                  <ChevronRight className="h-4 w-4 text-gray-500" />
                </button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {loading ? (
                <div className="text-center py-8 text-gray-500">加载中...</div>
              ) : (
                <>
                  {/* 草稿箱区域 */}
                  <div className="border-b pb-4">
                    <button
                      type="button"
                      onClick={() => setIsDraftsExpanded(!isDraftsExpanded)}
                      className="w-full flex items-center justify-between p-3 bg-yellow-50 hover:bg-yellow-100 rounded-lg transition-colors"
                    >
                      <span className="font-medium text-gray-900 flex items-center gap-2">
                        📝 草稿箱
                        <span className="text-sm text-gray-600">({drafts.length})</span>
                      </span>
                      {isDraftsExpanded ? (
                        <ChevronLeft className="w-5 h-5 text-gray-500" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-gray-500" />
                      )}
                    </button>
                    
                    {isDraftsExpanded && (
                      <div className="mt-3 space-y-3">
                        {drafts.length === 0 ? (
                          <p className="text-center py-6 text-gray-500 text-sm">暂无草稿</p>
                        ) : (
                          drafts.map((problem: any) => (
                            <div key={problem.id} className="flex items-start gap-4 p-4 border border-yellow-200 bg-yellow-50/30 rounded-lg hover:bg-yellow-50 transition-colors">
                              {problem.imageUrl ? (
                                <img src={problem.imageUrl} alt="Problem" className="w-20 h-20 object-cover rounded-md flex-shrink-0" />
                              ) : (
                                <div className="w-20 h-20 bg-gray-100 rounded-md flex items-center justify-center flex-shrink-0 text-gray-400">
                                  <ImageIcon className="w-6 h-6" />
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-1">
                                  <h4 className="font-semibold text-gray-900">{problem.date}</h4>
                                  <span className="text-xs px-2 py-0.5 bg-yellow-200 text-yellow-800 rounded-full">
                                    草稿
                                  </span>
                                </div>
                                <p className="text-gray-700 text-sm line-clamp-2">{problem.content}</p>
                                <p className="text-xs text-gray-500 mt-2">
                                  创建于 {new Date(problem.createdAt).toLocaleString('zh-CN')}
                                </p>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>

                  {/* 历史题目区域 */}
                  <div>
                    <button
                      type="button"
                      onClick={() => setIsPublishedExpanded(!isPublishedExpanded)}
                      className="w-full flex items-center justify-between p-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                    >
                      <span className="font-medium text-gray-900 flex items-center gap-2">
                        📚 已发布题目
                        <span className="text-sm text-gray-600">({published.length})</span>
                      </span>
                      {isPublishedExpanded ? (
                        <ChevronLeft className="w-5 h-5 text-gray-500" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-gray-500" />
                      )}
                    </button>
                    
                    {isPublishedExpanded && (
                      <div className="mt-3 space-y-3">
                        {published.length === 0 ? (
                          <p className="text-center py-6 text-gray-500 text-sm">暂无已发布题目</p>
                        ) : (
                          published.map((problem) => (
                            <div key={problem.id} className="flex items-start gap-4 p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                              {problem.imageUrl ? (
                                <img src={problem.imageUrl} alt="Problem" className="w-20 h-20 object-cover rounded-md flex-shrink-0" />
                              ) : (
                                <div className="w-20 h-20 bg-gray-100 rounded-md flex items-center justify-center flex-shrink-0 text-gray-400">
                                  <ImageIcon className="w-6 h-6" />
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-1">
                                  <h4 className="font-semibold text-gray-900">{problem.date}</h4>
                                  <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
                                    {problem._count.submissions} 人提交
                                  </span>
                                </div>
                                <p className="text-gray-700 text-sm line-clamp-2">{problem.content}</p>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}
        </div>
        {isHistoryOpen && (
          <button
            type="button"
            onClick={() => setIsHistoryOpen(false)}
            className="absolute top-0 right-0 h-full w-7 flex items-center justify-center bg-white border border-gray-200 rounded-l-full shadow-md hover:bg-gray-50"
            aria-label="收起历史题目"
          >
            <ChevronRight className="h-4 w-4 text-gray-500" />
          </button>
        )}
      </div>
    </div>
  )
}
