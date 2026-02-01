'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Label, Input, Card, CardContent } from '@/components/ui'
import { Upload, Loader2 } from 'lucide-react'

export default function SubmitForm({ problemId }: { problemId: number }) {
  const [content, setContent] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const router = useRouter()

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
    if (!content && !imageUrl) {
        alert('请至少填写文字或上传图片')
        return
    }
    
    setSubmitting(true)

    try {
      const res = await fetch('/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ problemId, content, imageUrl }),
      })

      if (res.ok) {
        router.refresh()
      } else {
        alert('提交失败')
      }
    } catch (error) {
      alert('提交失败')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        <h3 className="font-semibold text-lg">提交解答</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
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
