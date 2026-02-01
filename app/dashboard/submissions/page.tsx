'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, Button, Label } from '@/components/ui'
import { CheckSquare, ChevronDown, ChevronUp, CheckCircle, XCircle, Clock, Save, History } from 'lucide-react'

type Submission = {
  id: number
  content: string | null
  imageUrl: string | null
  status: 'PENDING' | 'CORRECT' | 'WRONG'
  feedback: string | null
  createdAt: string
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

export default function SubmissionsPage() {
  const [groupedSubmissions, setGroupedSubmissions] = useState<GroupedSubmission[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'ALL' | 'PENDING'>('PENDING')
  const [expandedKey, setExpandedKey] = useState<string | null>(null)
  
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

        setGroupedSubmissions(Object.values(groups))
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
      } else {
        alert('保存失败')
      }
    } catch (error) {
      alert('保存失败')
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
