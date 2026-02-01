'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, Input, Button, Label } from '@/components/ui'
import { BookOpen, Upload, Loader2, Image as ImageIcon } from 'lucide-react'

type Problem = {
  id: number
  date: string
  content: string
  imageUrl: string | null
  _count: {
    submissions: number
  }
}

export default function ProblemsPage() {
  const [problems, setProblems] = useState<Problem[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [uploading, setUploading] = useState(false)

  // Form state
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [content, setContent] = useState('')
  const [imageUrl, setImageUrl] = useState('')

  // Answer state
  const [answerContent, setAnswerContent] = useState('')
  const [answerImageUrl, setAnswerImageUrl] = useState('')
  const [answerReleaseDate, setAnswerReleaseDate] = useState('')

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
  }, [])

  // Auto set answer release date when date changes
  useEffect(() => {
    if (date) {
      const d = new Date(date)
      d.setDate(d.getDate() + 1)
      setAnswerReleaseDate(d.toISOString().split('T')[0])
    }
  }, [date])

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
        alert('图片上传失败')
      }
    } catch (error) {
      alert('图片上传出错')
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const res = await fetch('/api/problems', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date,
          content,
          imageUrl,
          answerContent,
          answerImageUrl,
          answerReleaseDate: answerReleaseDate ? new Date(answerReleaseDate).toISOString() : undefined
        }),
      })

      if (res.ok) {
        setContent('')
        setImageUrl('')
        setAnswerContent('')
        setAnswerImageUrl('')
        fetchProblems()
        alert('发布成功！题目将按设定时间对学生可见。')
      } else {
        const data = await res.json()
        alert(data.message || '发布失败')
      }
    } catch (error) {
      alert('发布失败')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold tracking-tight text-gray-800">每日一题管理</h2>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Create Problem Form */}
        <Card className="md:col-span-1 h-fit">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              发布新题目
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="date">题目发布日期</Label>
                <Input
                  id="date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
                <p className="text-xs text-gray-500">设定未来日期可实现定时发布。</p>
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
                  <Label htmlFor="answerDate">答案发布日期</Label>
                  <Input
                    id="answerDate"
                    type="date"
                    value={answerReleaseDate}
                    onChange={(e) => setAnswerReleaseDate(e.target.value)}
                  />
                  <p className="text-xs text-gray-500">默认设定为题目发布日的次日。</p>
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

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? <Loader2 className="animate-spin" /> : '发布题目'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Problems List */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              历史题目
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-gray-500">加载中...</div>
            ) : problems.length === 0 ? (
              <div className="text-center py-8 text-gray-500">暂无题目</div>
            ) : (
              <div className="space-y-4">
                {problems.map((problem) => (
                  <div key={problem.id} className="flex items-start gap-4 p-4 border rounded-lg hover:bg-gray-50">
                    {problem.imageUrl ? (
                      <img src={problem.imageUrl} alt="Problem" className="w-24 h-24 object-cover rounded-md bg-gray-100 flex-shrink-0" />
                    ) : (
                      <div className="w-24 h-24 bg-gray-100 rounded-md flex items-center justify-center flex-shrink-0 text-gray-400">
                        <ImageIcon className="w-8 h-8" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-lg">{problem.date}</h4>
                        <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
                          {problem._count.submissions} 人提交
                        </span>
                      </div>
                      <p className="text-gray-600 mt-1 text-sm line-clamp-2">{problem.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
