'use client'

import { useState, useEffect } from 'react'
import { Button, Input, Label } from '@/components/ui'
import { Send, User, Image as ImageIcon, Loader2, Smile } from 'lucide-react'
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react'

type Comment = {
  id: number
  content: string
  imageUrl: string | null
  createdAt: string
  user: {
    username: string
    displayName: string | null
  }
}

export default function CommentsSection({ problemId }: { problemId: number }) {
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)

  const fetchComments = async () => {
    const res = await fetch(`/api/comments?problemId=${problemId}`)
    if (res.ok) setComments(await res.json())
  }

  useEffect(() => {
    fetchComments()
  }, [problemId])

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
    if (!newComment.trim() && !imageUrl) return

    setSubmitting(true)
    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ problemId, content: newComment, imageUrl }),
      })
      if (res.ok) {
        setNewComment('')
        setImageUrl('')
        fetchComments()
      }
    } finally {
      setSubmitting(false)
    }
  }

  const onEmojiClick = (emojiData: EmojiClickData) => {
    setNewComment((prev) => prev + emojiData.emoji)
    setShowEmojiPicker(false)
  }

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-lg border-b pb-2">讨论区 ({comments.length})</h3>
      
      <div className="space-y-4 max-h-[400px] overflow-y-auto">
        {comments.length === 0 ? (
          <p className="text-gray-500 text-sm py-2">暂无评论，快来抢沙发！</p>
        ) : (
          comments.map(c => (
            <div key={c.id} className="flex gap-3 text-sm">
              <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center shrink-0 text-gray-500">
                <User className="w-4 h-4" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900">{c.user.displayName || c.user.username}</span>
                  <span className="text-xs text-gray-400">{new Date(c.createdAt).toLocaleString()}</span>
                </div>
                {c.content && <p className="text-gray-700">{c.content}</p>}
                {c.imageUrl && (
                    <img src={c.imageUrl} alt="Comment Image" className="mt-1 rounded-md border max-h-32 object-contain" />
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <form onSubmit={handleSubmit} className="pt-4 border-t">
        <div className="flex gap-2 items-center">
            <div className="relative">
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-gray-500 hover:text-yellow-500"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                >
                    <Smile className="w-5 h-5" />
                </Button>
                {showEmojiPicker && (
                    <div className="absolute bottom-12 left-0 z-50 shadow-xl rounded-lg">
                        <div className="fixed inset-0 z-40" onClick={() => setShowEmojiPicker(false)}></div>
                        <div className="relative z-50">
                            <EmojiPicker onEmojiClick={onEmojiClick} width={300} height={400} />
                        </div>
                    </div>
                )}
            </div>

            <Input 
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="写下你的想法..."
            className="flex-1"
            />
            <div className="relative">
                <input 
                    type="file" 
                    id="comment-image" 
                    className="hidden" 
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={uploading}
                />
                <Label htmlFor="comment-image" className={`h-10 px-3 flex items-center justify-center border rounded-md cursor-pointer hover:bg-gray-50 ${imageUrl ? 'text-blue-600 border-blue-200 bg-blue-50' : 'text-gray-500'}`}>
                    {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
                </Label>
            </div>
            <Button type="submit" disabled={submitting || (!newComment.trim() && !imageUrl)}>
            <Send className="w-4 h-4" />
            </Button>
        </div>
        {imageUrl && (
            <div className="mt-2 relative w-fit">
                <img src={imageUrl} alt="Preview" className="h-16 rounded border" />
                <button 
                    type="button"
                    onClick={() => setImageUrl('')}
                    className="absolute -top-2 -right-2 bg-white rounded-full p-0.5 border shadow-sm text-red-500 hover:text-red-700"
                >
                    <span className="sr-only">Remove</span>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
            </div>
        )}
      </form>
    </div>
  )
}
