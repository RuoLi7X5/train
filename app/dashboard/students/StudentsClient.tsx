'use client'

import { useState, useEffect } from 'react'
import useSWR from 'swr'
import { Card, CardContent, CardHeader, CardTitle, Input, Button, Label, Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui'
import { Plus, User, Loader2, KeyRound, UserMinus, Search, UserPlus, MoreHorizontal, CheckCircle, Ban, Trash2, RefreshCcw, AlertCircle, Check, X } from 'lucide-react'

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

const fetcher = (url: string) => fetch(url).then(async (res) => {
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || errorData.message || 'Failed to fetch data');
  }
  return res.json();
})

export default function StudentsClient({ userRole, userId }: StudentsClientProps) {
  // Main List SWR
  const { data: usersData, error: usersError, isLoading: isUsersLoading, mutate: mutateMainList } = useSWR<UserData[]>('/api/users', fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 5000,
  })

  const users = usersData || []
  const isUsersError = !!usersError

  // Search SWR
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery)
    }, 500)
    return () => clearTimeout(timer)
  }, [searchQuery])

  const searchKey = debouncedSearchQuery.length >= 3
    ? `/api/users?view=unbound&search=${encodeURIComponent(debouncedSearchQuery)}`
    : null

  const { data: searchResultsData, isLoading: isSearching, mutate: mutateSearchList } = useSWR<UserData[]>(searchKey, fetcher)
  const searchResults = searchResultsData || []

  // Component State
  const [isAdding, setIsAdding] = useState(false)
  const [activeTab, setActiveTab] = useState<'create' | 'add'>('create')

  // Batch Generate Form
  const [batchCount, setBatchCount] = useState('5')
  const [batchPassword, setBatchPassword] = useState('')
  const [generatedUsers, setGeneratedUsers] = useState<UserData[]>([])
  const [showConfirm, setShowConfirm] = useState(false)

  // Actions State
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [isResetting, setIsResetting] = useState(false)
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false)
  const [selectedSearchUser, setSelectedSearchUser] = useState<number | null>(null)

  const isCoach = userRole === 'COACH'
  const isSuperAdmin = userRole === 'SUPER_ADMIN'

  // Handlers
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
        mutateMainList() // Refresh main list to show PENDING users
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
        mutateMainList() // Refresh main list
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
        mutateMainList() // Refresh main list
        mutateSearchList() // Refresh search results (remove bound user)
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
        mutateMainList()
      } else {
        const data = await res.json()
        alert(data.message || '移除失败')
      }
    } catch (error) {
      alert('移除失败')
    }
  }

  const handleUpdateStatus = async (user: UserData, newStatus: string) => {
    if (!confirm(`确定要${newStatus === 'DISABLED' ? '禁用' : '激活'}用户 ${user.username} 吗？`)) return

    try {
      const res = await fetch(`/api/users/${user.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })
      if (res.ok) {
        alert('操作成功')
        mutateMainList()
      } else {
        const data = await res.json()
        alert(data.message || '操作失败')
      }
    } catch (error) {
      alert('操作失败')
    }
  }

  const handleDeleteStudent = async (user: UserData) => {
    if (!confirm(`警告：确定要彻底删除学生 ${user.username} 吗？此操作不可逆！\n\n如果该账号有做题记录，删除可能会失败。建议先禁用或移除。`)) return

    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        alert('删除成功')
        mutateMainList()
      } else {
        const data = await res.json()
        alert(data.error || '删除失败')
      }
    } catch (error) {
      alert('删除失败')
    }
  }

  const pageTitle = isSuperAdmin ? '教练账号生成' : '学生账号管理'

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold tracking-tight text-gray-800">{pageTitle}</h2>
        <Button variant="outline" size="icon" onClick={() => mutateMainList()} title="刷新数据">
          <RefreshCcw className={`h-4 w-4 ${isUsersLoading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

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
            {isUsersError ? (
              <div className="rounded-md bg-red-50 p-4 border border-red-200">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <AlertCircle className="h-5 w-5 text-red-400" aria-hidden="true" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">加载数据失败</h3>
                    <div className="mt-2 text-sm text-red-700">
                      <p>无法连接到服务器或数据获取出错。请点击刷新重试。</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : isUsersLoading && !usersData ? (
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
                                onClick={() => {
                                  setSelectedUser(user)
                                  setIsResetDialogOpen(true)
                                }}
                              >
                                <KeyRound className="mr-2 h-4 w-4" />
                                <span>重置密码</span>
                              </DropdownMenuItem>

                              {isCoach && (
                                <>
                                  <DropdownMenuItem
                                    onClick={() => handleUnbind(user)}
                                    className="text-gray-600"
                                  >
                                    <UserMinus className="mr-2 h-4 w-4" />
                                    <span>移除 (解绑)</span>
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

                                  {isSuperAdmin && (
                                    <DropdownMenuItem
                                      onClick={() => handleDeleteStudent(user)}
                                      className="text-red-600 focus:text-red-600 focus:bg-red-50"
                                    >
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      <span>删除账号</span>
                                    </DropdownMenuItem>
                                  )}
                                </>
                              )}
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