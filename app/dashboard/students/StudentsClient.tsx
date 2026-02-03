'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, Input, Button, Label, Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui'
import { Plus, User, Loader2, Check, X, KeyRound, UserMinus, Search, UserPlus } from 'lucide-react'

type UserData = {
  id: number
  username: string
  displayName: string | null
  createdAt: string
  status?: string
  _count: {
    submissions: number
  }
}

interface StudentsClientProps {
  userRole: string
  userId: number
}

export default function StudentsClient({ userRole, userId }: StudentsClientProps) {
  const [users, setUsers] = useState<UserData[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdding, setIsAdding] = useState(false)

  // Batch Generate Form (For both Admin and Coach)
  const [batchCount, setBatchCount] = useState('5')
  const [batchPassword, setBatchPassword] = useState('')
  const [generatedUsers, setGeneratedUsers] = useState<UserData[]>([])
  const [showConfirm, setShowConfirm] = useState(false)

  // Action State
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [isResetting, setIsResetting] = useState(false)
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false)

  // Add Existing Student State (New)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<{ id: number, username: string, displayName: string | null }[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [selectedSearchUser, setSelectedSearchUser] = useState<number | null>(null)
  const [activeTab, setActiveTab] = useState<'create' | 'add'>('create')

  const isCoach = userRole === 'COACH'
  const isSuperAdmin = userRole === 'SUPER_ADMIN'

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users')
      if (res.ok) {
        const data = await res.json()
        setUsers(data)
      }
    } catch (error) {
      console.error('Failed to fetch users', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  // Search Effect
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchQuery.length < 3) {
        setSearchResults([])
        return
      }
      setIsSearching(true)
      try {
        const res = await fetch(`/api/users?view=unbound&search=${encodeURIComponent(searchQuery)}`)
        if (res.ok) {
          const data = await res.json()
          setSearchResults(data)
        }
      } catch (e) {
        console.error(e)
      } finally {
        setIsSearching(false)
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [searchQuery])

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
        setGeneratedUsers(data.users)
        setShowConfirm(true)
        fetchUsers()
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
    if (generatedUsers.length === 0) return
    setIsAdding(true)

    try {
      const res = await fetch('/api/users/batch/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userIds: generatedUsers.map(u => u.id),
          action
        })
      })

      if (res.ok) {
        if (action === 'confirm') {
          alert('账号已激活')
        } else {
          alert('账号已释放')
        }
        setGeneratedUsers([])
        setShowConfirm(false)
        setBatchPassword('')
        fetchUsers()
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

  const handleBindStudent = async () => {
    if (!selectedSearchUser) return
    setIsAdding(true)
    try {
      const res = await fetch(`/api/users/${selectedSearchUser}/bind`, { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        alert('添加成功')
        setSearchQuery('')
        setSelectedSearchUser(null)
        fetchUsers()
      } else {
        alert(data.message || '添加失败')
      }
    } catch (e) {
      alert('添加失败')
    } finally {
      setIsAdding(false)
    }
  }

  const handleResetPassword = async () => {
    if (!selectedUser || !newPassword) return
    setIsResetting(true)
    try {
      const res = await fetch(`/api/users/${selectedUser.id}/password`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newPassword })
      })
      if (res.ok) {
        alert('密码重置成功')
        setIsResetDialogOpen(false)
        setNewPassword('')
        setSelectedUser(null)
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

  const handleUnbind = async (user: UserData) => {
    if (!confirm(`确定要移除学生 ${user.displayName || user.username} 吗？\n该账号将不再归属于您，但不会被删除。`)) return

    try {
      const res = await fetch(`/api/users/${user.id}/unbind`, {
        method: 'POST'
      })
      if (res.ok) {
        alert('移除成功')
        fetchUsers()
      } else {
        const data = await res.json()
        alert(data.message || '移除失败')
      }
    } catch (error) {
      alert('移除失败')
    }
  }

  const pageTitle = isSuperAdmin ? '教练账号生成' : '学生账号管理'
  const addButtonText = '批量生成账号'

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold tracking-tight text-gray-800">{pageTitle}</h2>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Left Column: Forms */}
        <div className="md:col-span-1 space-y-6">
          {/* Batch Confirm UI (Coach Only) */}
          {showConfirm && (
            <Card className="border-blue-500 shadow-md">
              <CardHeader className="bg-blue-50 pb-2">
                <CardTitle className="text-lg text-blue-700">确认新账号</CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <div className="text-sm text-gray-600">
                  已生成 {generatedUsers.length} 个待定账号。
                  <br />
                  请确认是否正式激活？
                </div>
                <div className="max-h-40 overflow-y-auto border rounded p-2 bg-white text-sm">
                  {generatedUsers.map(u => (
                    <div key={u.id} className="flex justify-between">
                      <span>{u.username}</span>
                      <span className="text-gray-500">{u.displayName}</span>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleBatchAction('confirm')}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                    disabled={isAdding}
                  >
                    <Check className="w-4 h-4 mr-1" /> 确认激活
                  </Button>
                  <Button
                    onClick={() => handleBatchAction('cancel')}
                    variant="destructive"
                    className="flex-1"
                    disabled={isAdding}
                  >
                    <X className="w-4 h-4 mr-1" /> 取消释放
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Add Form */}
          <Card className="h-fit">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  {activeTab === 'create' ? <Plus className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
                  {activeTab === 'create' ? (isSuperAdmin ? '批量生成教练' : '批量生成账号') : '添加已有学生'}
                </CardTitle>
              </div>
              {/* Tab Switcher (Only for Coach) */}
              {isCoach && (
                <div className="flex mt-4 bg-gray-100 p-1 rounded-md">
                  <button
                    onClick={() => setActiveTab('create')}
                    className={`flex-1 py-1.5 text-sm font-medium rounded-sm transition-all ${activeTab === 'create' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    批量生成
                  </button>
                  <button
                    onClick={() => setActiveTab('add')}
                    className={`flex-1 py-1.5 text-sm font-medium rounded-sm transition-all ${activeTab === 'add' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    添加已有
                  </button>
                </div>
              )}
            </CardHeader>
            <CardContent>
              {activeTab === 'create' ? (
                <form onSubmit={handleBatchGenerate} className="space-y-4">
                  <div className="p-3 bg-yellow-50 text-yellow-800 text-sm rounded border border-yellow-100">
                    生成的账号将以 <strong>R</strong> 开头，自动分配 ID。
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="batchCount">生成数量 (1-50)</Label>
                    <Input
                      id="batchCount"
                      type="number"
                      min="1"
                      max="50"
                      value={batchCount}
                      onChange={(e) => setBatchCount(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="batchPassword">统一初始密码</Label>
                    <Input
                      id="batchPassword"
                      value={batchPassword}
                      onChange={(e) => setBatchPassword(e.target.value)}
                      placeholder="所有新账号的密码"
                      required
                      minLength={6}
                    />
                    <p className="text-xs text-gray-500">请务必记住此密码并告知{isSuperAdmin ? '教练' : '学生'}。</p>
                  </div>
                  <Button type="submit" className="w-full" disabled={isAdding || showConfirm}>
                    {isAdding ? <Loader2 className="animate-spin" /> : '批量生成'}
                  </Button>
                </form>
              ) : (
                <div className="space-y-4">
                  <div className="p-3 bg-blue-50 text-blue-800 text-sm rounded border border-blue-100">
                    仅支持搜索<strong>未绑定</strong>任何教练的学生账号。
                  </div>
                  <div className="space-y-2">
                    <Label>搜索用户名 (输入至少3位)</Label>
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                      <Input
                        placeholder="输入 R 开头的用户名..."
                        className="pl-9"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Search Results */}
                  {searchQuery.length >= 3 && (
                    <div className="border rounded-md max-h-48 overflow-y-auto bg-white divide-y">
                      {isSearching ? (
                        <div className="p-3 text-center text-sm text-gray-500">搜索中...</div>
                      ) : searchResults.length === 0 ? (
                        <div className="p-3 text-center text-sm text-gray-500">未找到匹配的游离账号</div>
                      ) : (
                        searchResults.map(u => (
                          <div
                            key={u.id}
                            onClick={() => setSelectedSearchUser(u.id)}
                            className={`p-2 flex items-center justify-between cursor-pointer hover:bg-blue-50 text-sm ${selectedSearchUser === u.id ? 'bg-blue-50 ring-1 ring-blue-500' : ''}`}
                          >
                            <div>
                              <div className="font-medium">{u.username}</div>
                              <div className="text-xs text-gray-500">{u.displayName}</div>
                            </div>
                            {selectedSearchUser === u.id && <Check className="w-4 h-4 text-blue-600" />}
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  <Button onClick={handleBindStudent} className="w-full" disabled={isAdding || !selectedSearchUser}>
                    {isAdding ? <Loader2 className="animate-spin" /> : '确认添加'}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: List */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="w-5 h-5" />
              {isSuperAdmin ? '教练列表' : '学生列表'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-gray-500">加载中...</div>
            ) : users.length === 0 ? (
              <div className="text-center py-8 text-gray-500">暂无数据</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 text-gray-700 uppercase">
                    <tr>
                      <th className="px-4 py-3">账号ID</th>
                      <th className="px-4 py-3">显示名称</th>
                      <th className="px-4 py-3">状态</th>
                      <th className="px-4 py-3">提交次数</th>
                      <th className="px-4 py-3">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.id} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium">{user.username}</td>
                        <td className="px-4 py-3">{user.displayName || '-'}</td>
                        <td className="px-4 py-3">
                          {user.status === 'PENDING' ? (
                            <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs">待激活</span>
                          ) : (
                            <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">正常</span>
                          )}
                        </td>
                        <td className="px-4 py-3">{user._count.submissions}</td>
                        <td className="px-4 py-3 flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedUser(user)
                              setIsResetDialogOpen(true)
                            }}
                          >
                            <KeyRound className="w-4 h-4" />
                          </Button>
                          {isCoach && (
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleUnbind(user)}
                            >
                              <UserMinus className="w-4 h-4" />
                            </Button>
                          )}
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
          <DialogHeader>
            <DialogTitle>重置密码: {selectedUser?.username}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">新密码</Label>
              <Input
                id="newPassword"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="输入新密码"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsResetDialogOpen(false)}>取消</Button>
            <Button onClick={handleResetPassword} disabled={isResetting || !newPassword}>
              {isResetting ? <Loader2 className="animate-spin" /> : '确认重置'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}