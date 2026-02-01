'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui'
import { CheckCircle, XCircle, Clock, AlertCircle, Share2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui'

type Submission = {
  id: number
  content: string | null
  imageUrl: string | null
  status: string
  feedback: string | null
  createdAt: string
}

export default function SubmissionHistory({ 
  submissions, 
  problemId 
}: { 
  submissions: Submission[]
  problemId: number 
}) {
  const [sharingId, setSharingId] = useState<number | null>(null)

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

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-xl">我的提交记录 ({submissions.length})</h3>
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
