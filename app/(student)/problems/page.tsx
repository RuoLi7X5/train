'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, Button } from '@/components/ui'
import { BookOpen, Calendar, ArrowRight, CheckCircle } from 'lucide-react'
import Link from 'next/link'

type Problem = {
  id: number
  date: string
  content: string
  imageUrl: string | null
  _count: {
    submissions: number
  }
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
              {problem.imageUrl && (
                <div className="h-40 overflow-hidden border-b bg-gray-100">
                  <img src={problem.imageUrl} alt="Problem" className="w-full h-full object-cover" />
                </div>
              )}
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
