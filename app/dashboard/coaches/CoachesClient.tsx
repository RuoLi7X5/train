'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, Input, Button, Label, Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui'
import { Plus, User, Loader2, KeyRound, Ban, CheckCircle, Trash2, MoreHorizontal } from 'lucide-react'

type CoachData = {
  id: number
  username: string
  displayName: string | null
  createdAt: string
  status?: string
  _count: {
    students: number
  }
}

export default function CoachesClient() {
  const [coaches, setCoaches] = useState<CoachData[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdding, setIsAdding] = useState(false)

  // Batch Generate Form
  const [batchCount, setBatchCount] = useState('1')
  const [batchPassword, setBatchPassword] = useState('')
  const [generatedCoaches, setGeneratedCoaches] = useState<CoachData[]>([])
  const [showConfirm, setShowConfirm] = useState(false)

  // Reset Password
  const [selectedCoach, setSelectedCoach] = useState<CoachData | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [isResetting, setIsResetting] = useState(false)
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false)

  const fetchCoaches = async () => {
    try {
      // 这里的 API 需要返回教练列表
      // 目前 /api/users 对 SUPER_ADMIN 返回的是 COACH 列表，所以直接复用
      const res = await fetch('/api/users')
      if (res.ok) {
        const data = await res.json()
        setCoaches(data)
      }
    } catch (error) {
      console.error('Failed to fetch coaches', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCoaches()
  }, [])

  const handleBatchGenerate = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsAdding(true)

    try {
      const res = await fetch('/api/users/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count: batchCount, password: batchPassword })
      })

      const data = await res.json()
      if (res.ok || res.status === 206) {
        setGeneratedCoaches(data.users)
        setShowConfirm(true)
        fetchCoaches()
      } else {
        alert(data.message || '生成失败')
      }
    } catch (error) {
      alert('生成失败')
    } finally {
      setIsAdding(false)
    }
  }

  const handleBatchAction = async (action: 'confirm' | 'cancel') => {
    if (generatedCoaches.length === 0) return
    setIsAdding(true)

    try {
      const res = await fetch('/api/users/batch/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userIds: generatedCoaches.map(u => u.id),
          action
        })
      })

      if (res.ok) {
        if (action === 'confirm') {
          alert('账号已激活')
        } else {
          alert('账号已释放')
        }
        setGeneratedCoaches([])
        setShowConfirm(false)
        setBatchPassword('')
        fetchCoaches()
      } else {
        const data = await res.json()
        alert(data.message || '操作失败')
      }
    } catch (error) {
      alert('操作失败')
    } finally {
      setIsAdding(false)
    }
  }

  const handleResetPassword = async () => {
    if (!selectedCoach || !newPassword) return
    setIsResetting(true)
    try {
      const res = await fetch(`/api/users/${selectedCoach.id}/password`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newPassword })
      })
      if (res.ok) {
        alert('密码重置成功')
        setIsResetDialogOpen(false)
        setNewPassword('')
        setSelectedCoach(null)
      } else {
        const data = await res.json()
        alert(data.message || '重置失败')
      }
    } catch (error) {
      alert('重置失败')
    } finally {
      setIsResetting(false)
    }
  }

  const handleUpdateStatus = async (user: CoachData, newStatus: string) => {
    if (!confirm(`确定要${newStatus === 'DISABLED' ? '禁用' : '激活'}用户 ${user.username} 吗？`)) return

    try {
      const res = await fetch(`/api/users/${user.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })
      if (res.ok) {
        alert('操作成功')
        fetchCoaches()
      } else {
        const data = await res.json()
        alert(data.message || '操作失败')
      }
    } catch (error) {
      alert('操作失败')
    }
  }

  const handleDeleteCoach = async (user: CoachData) => {
    if (!confirm(`警告：确定要彻底删除教练 ${user.username} 吗？此操作不可逆！\n\n如果该教练下有学生或题目数据，删除可能会失败。建议先禁用。`)) return

    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        alert('删除成功')
        fetchCoaches()
      } else {
        const data = await res.json()
        alert(data.error || '删除失败')
      }
    } catch (error) {
      alert('删除失败')
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold tracking-tight text-gray-800">教练管理</h2>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Left Column: Generate Form */}
        <div className="md:col-span-1 space-y-6">
          {showConfirm && (
            <Card className="border-blue-500 shadow-md">
              <CardHeader className="bg-blue-50 pb-2">
                <CardTitle className="text-lg text-blue-700">确认新账号</CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <div className="text-sm text-gray-600">
                  已生成 {generatedCoaches.length} 个待定教练账号。
                </div>
                <div className="max-h-40 overflow-y-auto border rounded p-2 bg-white text-sm">
                  {generatedCoaches.map(u => (
                    <div key={u.id} className="flex justify-between">
                      <span>{u.username}</span>
                      <span className="text-gray-500">{u.displayName}</span>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => handleBatchAction('confirm')} className="flex-1 bg-green-600">确认激活</Button>
                  <Button onClick={() => handleBatchAction('cancel')} variant="destructive" className="flex-1">取消释放</Button>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Plus className="w-5 h-5" />
                批量生成教练
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleBatchGenerate} className="space-y-4">
                <div className="p-3 bg-yellow-50 text-yellow-800 text-sm rounded border border-yellow-100">
                  生成的教练账号将以 <strong>R</strong> 开头。
                </div>
                <div className="space-y-2">
                  <Label>生成数量</Label>
                  <Input type="number" min="1" max="50" value={batchCount} onChange={e => setBatchCount(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label>统一初始密码</Label>
                  <Input value={batchPassword} onChange={e => setBatchPassword(e.target.value)} required minLength={6} placeholder="设置初始密码" />
                </div>
                <Button type="submit" className="w-full" disabled={isAdding || showConfirm}>
                  {isAdding ? <Loader2 className="animate-spin" /> : '开始生成'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Coach List */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" /> 教练列表
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? <div>加载中...</div> : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 uppercase">
                    <tr>
                      <th className="px-4 py-3">账号ID</th>
                      <th className="px-4 py-3">显示名称</th>
                      <th className="px-4 py-3">状态</th>
                      <th className="px-4 py-3">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {coaches.map(user => (
                      <tr key={user.id} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium">{user.username}</td>
                        <td className="px-4 py-3">{user.displayName}</td>
                        <td className="px-4 py-3">
                          {user.status === 'PENDING' ? (
                            <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs">待激活</span>
                          ) : user.status === 'DISABLED' ? (
                            <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs">已禁用</span>
                          ) : (
                            <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">正常</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">打开菜单</span>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => { setSelectedCoach(user); setIsResetDialogOpen(true); }}
                              >
                                <KeyRound className="mr-2 h-4 w-4" />
                                <span>重置密码</span>
                              </DropdownMenuItem>

                              {user.status === 'PENDING' && (
                                <DropdownMenuItem
                                  onClick={() => handleUpdateStatus(user, 'ACTIVE')}
                                  className="text-green-600"
                                >
                                  <CheckCircle className="mr-2 h-4 w-4" />
                                  <span>激活账号</span>
                                </DropdownMenuItem>
                              )}

                              {user.status === 'ACTIVE' && (
                                <DropdownMenuItem
                                  onClick={() => handleUpdateStatus(user, 'DISABLED')}
                                  className="text-orange-600"
                                >
                                  <Ban className="mr-2 h-4 w-4" />
                                  <span>禁用账号</span>
                                </DropdownMenuItem>
                              )}

                              {user.status === 'DISABLED' && (
                                <DropdownMenuItem
                                  onClick={() => handleUpdateStatus(user, 'ACTIVE')}
                                  className="text-green-600"
                                >
                                  <CheckCircle className="mr-2 h-4 w-4" />
                                  <span>启用账号</span>
                                </DropdownMenuItem>
                              )}

                              <DropdownMenuItem
                                onClick={() => handleDeleteCoach(user)}
                                className="text-red-600 focus:text-red-600 focus:bg-red-50"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                <span>删除账号</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Reset Password Dialog */}
      <Dialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>重置密码: {selectedCoach?.username}</DialogTitle></DialogHeader>
          <div className="space-y-2 py-4">
            <Label>新密码</Label>
            <Input value={newPassword} onChange={e => setNewPassword(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsResetDialogOpen(false)}>取消</Button>
            <Button onClick={handleResetPassword} disabled={isResetting || !newPassword}>确认重置</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}