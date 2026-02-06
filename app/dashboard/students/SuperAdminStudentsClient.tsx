'use client'

import { useState, useEffect } from 'react'
import useSWR from 'swr'
import { Card, CardContent, CardHeader, CardTitle, Input, Button, Accordion, AccordionContent, AccordionItem, AccordionTrigger, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, Label } from '@/components/ui'
import { User, Search, KeyRound, UserMinus, ShieldAlert, MoreHorizontal, CheckCircle, Ban, Trash2, RefreshCcw, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react'

type UserData = {
  id: number
  username: string
  displayName: string | null
  status?: string
  createdAt: string
  _count: { submissions: number }
}

type CoachGroup = {
  id: number
  username: string
  displayName: string | null
  students: UserData[]
}

type HierarchyData = {
  grouped: CoachGroup[]
  unbound: UserData[]
}

const fetcher = (url: string) => fetch(url).then(async (res) => {
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to fetch data');
  }
  return res.json();
})

export default function SuperAdminStudentsClient() {
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('')

  // Debounce effect
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
    }, 500)
    return () => clearTimeout(timer)
  }, [searchTerm])

  const apiUrl = debouncedSearchTerm
    ? `/api/users?view=hierarchy&search=${encodeURIComponent(debouncedSearchTerm)}`
    : '/api/users?view=hierarchy'
  
  const { data, error, isLoading, mutate } = useSWR<HierarchyData>(apiUrl, fetcher, {
    revalidateOnFocus: false, 
    dedupingInterval: 5000,
    keepPreviousData: true, // Keep showing previous data while loading new search results
  })

  // Safe data access
  const safeData = data || { grouped: [], unbound: [] }
  const isError = !!error
  const isEmpty = !isLoading && !isError && safeData.grouped.length === 0 && safeData.unbound.length === 0

  // --- Sort & Pagination Logic (Local State) ---
  const [coachSortConfig, setCoachSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);
  const [coachCurrentPage, setCoachCurrentPage] = useState(1);
  const coachItemsPerPage = 20;

  const handleCoachSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (key === 'students') {
      direction = 'desc';
    } else if (key === 'createdAt') {
      direction = 'asc';
    } else if (key === 'username') {
      direction = 'asc';
    } else if (key === 'displayName') {
      direction = 'asc';
    }

    if (coachSortConfig && coachSortConfig.key === key) {
      direction = coachSortConfig.direction === 'asc' ? 'desc' : 'asc';
    }

    setCoachSortConfig({ key, direction });
    setCoachCurrentPage(1); 
  }

  const sortedCoaches = [...safeData.grouped].sort((a, b) => {
    if (!coachSortConfig) return 0;
    const { key, direction } = coachSortConfig;

    if (key === 'username') {
      return direction === 'asc'
        ? a.username.localeCompare(b.username)
        : b.username.localeCompare(a.username);
    }
    if (key === 'displayName') {
      const valA = a.displayName || '';
      const valB = b.displayName || '';
      return direction === 'asc'
        ? valA.localeCompare(valB, 'zh-CN')
        : valB.localeCompare(valA, 'zh-CN');
    }
    if (key === 'students') {
      return direction === 'asc'
        ? a.students.length - b.students.length
        : b.students.length - a.students.length;
    }
    if (key === 'createdAt') {
      const dateA = (a as any).createdAt ? new Date((a as any).createdAt).getTime() : 0;
      const dateB = (b as any).createdAt ? new Date((b as any).createdAt).getTime() : 0;
      return direction === 'asc' ? dateA - dateB : dateB - dateA;
    }
    return 0;
  });

  const coachTotalPages = Math.ceil(sortedCoaches.length / coachItemsPerPage);
  const paginatedCoaches = sortedCoaches.slice((coachCurrentPage - 1) * coachItemsPerPage, coachCurrentPage * coachItemsPerPage);


  // --- Action Handlers ---
  const handleUpdateStatus = async (userId: number, username: string, newStatus: string) => {
    if (!confirm(`确定要${newStatus === 'DISABLED' ? '禁用' : '激活'}用户 ${username} 吗？`)) return

    try {
      const res = await fetch(`/api/users/${userId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })
      if (res.ok) {
        alert('操作成功')
        mutate() // SWR Refresh
      } else {
        alert('操作失败')
      }
    } catch (error) {
      alert('操作失败')
    }
  }

  const handleDeleteStudent = async (userId: number, username: string) => {
    if (!confirm(`警告：确定要删除用户 ${username} 吗？此操作不可逆！\n\n如果该用户有做题记录，删除可能会失败。建议先禁用。`)) return

    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        alert('删除成功')
        mutate() // SWR Refresh
      } else {
        const data = await res.json()
        alert(data.error || '删除失败')
      }
    } catch (error) {
      alert('删除失败')
    }
  }

  const [resetTarget, setResetTarget] = useState<{ id: number, username: string } | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false)

  const handleResetPassword = async () => {
    if (!resetTarget || !newPassword) return
    try {
      const res = await fetch(`/api/users/${resetTarget.id}/password`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newPassword })
      })
      if (res.ok) {
        alert('密码重置成功')
        setIsResetDialogOpen(false)
        setNewPassword('')
        setResetTarget(null)
      } else {
        alert('重置失败')
      }
    } catch (error) {
      alert('重置失败')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold tracking-tight text-gray-800">棋手管理 (全局)</h2>
        <div className="flex items-center gap-2">
          <Search className="text-gray-400" />
          <Input
            placeholder="搜索棋手用户名或姓名..."
            className="w-64"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
          <Button variant="outline" size="icon" onClick={() => mutate()} title="刷新数据">
            <RefreshCcw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {isError ? (
        <div className="rounded-md bg-red-50 p-4 border border-red-200">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertCircle className="h-5 w-5 text-red-400" aria-hidden="true" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">加载数据失败</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>无法连接到服务器或数据获取出错。请检查网络后点击刷新。</p>
              </div>
              <div className="mt-4">
                <Button variant="outline" size="sm" onClick={() => mutate()} className="bg-red-50 hover:bg-red-100 text-red-800 border-red-200">
                  重试
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : isLoading && !data ? (
        <div className="text-center py-10 text-gray-500">加载中...</div>
      ) : (
        <div className="space-y-8">
          {/* Unbound Students Section */}
          {safeData.unbound.length > 0 && (
            <Card className="border-orange-200 bg-orange-50/30">
              <CardHeader>
                <CardTitle className="text-orange-700 flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5" />
                  未绑定/游离账号 ({safeData.unbound.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <StudentTable
                  students={safeData.unbound}
                  onStatusChange={handleUpdateStatus}
                  onDelete={handleDeleteStudent}
                  onResetPassword={(id, name) => { setResetTarget({ id, username: name }); setIsResetDialogOpen(true); }}
                />
              </CardContent>
            </Card>
          )}

          {/* Grouped by Coach Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-700">按教练分组</h3>

            {/* Coach Sort Header */}
            {safeData.grouped.length > 0 && (
              <div className="grid grid-cols-12 gap-4 px-8 py-2 bg-gray-100 rounded-t-lg text-xs font-semibold text-gray-600 uppercase border border-gray-200 border-b-0">
                <div className="col-span-3 cursor-pointer hover:text-blue-600 flex items-center gap-1" onClick={() => handleCoachSort('username')}>
                  账号ID {coachSortConfig?.key === 'username' && (coachSortConfig.direction === 'asc' ? '↑' : '↓')}
                </div>
                <div className="col-span-3 cursor-pointer hover:text-blue-600 flex items-center gap-1" onClick={() => handleCoachSort('displayName')}>
                  用户昵称 {coachSortConfig?.key === 'displayName' && (coachSortConfig.direction === 'asc' ? '↑' : '↓')}
                </div>
                <div className="col-span-3 cursor-pointer hover:text-blue-600 flex items-center gap-1" onClick={() => handleCoachSort('createdAt')}>
                  注册时间 {coachSortConfig?.key === 'createdAt' && (coachSortConfig.direction === 'asc' ? '↑' : '↓')}
                </div>
                <div className="col-span-3 text-right cursor-pointer hover:text-blue-600 flex items-center justify-end gap-1" onClick={() => handleCoachSort('students')}>
                  学生数量 {coachSortConfig?.key === 'students' && (coachSortConfig.direction === 'asc' ? '↑' : '↓')}
                </div>
              </div>
            )}

            {safeData.grouped.length === 0 ? (
              <div className="text-gray-500 italic py-8 text-center bg-gray-50 rounded-lg border border-dashed">
                {searchTerm ? '未找到匹配的教练或学生' : '暂无教练数据'}
              </div>
            ) : (
              <>
                <Accordion type="multiple" className="w-full space-y-2">
                  {paginatedCoaches.map(coach => (
                    <AccordionItem key={coach.id} value={`coach-${coach.id}`} className="border rounded-lg bg-white px-4">
                      <AccordionTrigger className="hover:no-underline py-4">
                        <div className="grid grid-cols-12 gap-4 w-full items-center text-sm px-4">
                          <div className="col-span-3 font-medium text-gray-900 truncate" title={coach.username}>
                            {coach.username}
                          </div>
                          <div className="col-span-3 text-gray-600 truncate" title={coach.displayName || ''}>
                            {coach.displayName || '-'}
                          </div>
                          <div className="col-span-3 text-gray-500">
                            {(coach as any).createdAt ? new Date((coach as any).createdAt).toLocaleDateString() : '-'}
                          </div>
                          <div className="col-span-3 flex justify-end pr-4">
                            <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-medium">
                              学员: {coach.students.length}
                            </span>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pt-2 pb-4 px-4 w-full">
                        {coach.students.length > 0 ? (
                          <div className="w-full overflow-hidden">
                            <StudentTable
                              students={coach.students}
                              coachName={coach.displayName || coach.username}
                              onStatusChange={handleUpdateStatus}
                              onDelete={handleDeleteStudent}
                              onResetPassword={(id, name) => { setResetTarget({ id, username: name }); setIsResetDialogOpen(true); }}
                            />
                          </div>
                        ) : (
                          <div className="text-gray-400 py-2 text-center text-sm">暂无学员</div>
                        )}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>

                {/* Coach Pagination */}
                {coachTotalPages > 1 && (
                  <div className="flex items-center justify-between px-4 py-3 bg-white border rounded-lg">
                    <div className="text-sm text-gray-500">
                      第 {coachCurrentPage} / {coachTotalPages} 页 (共 {safeData.grouped.length} 位教练)
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCoachCurrentPage(p => Math.max(1, p - 1))}
                        disabled={coachCurrentPage === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                        上一页
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCoachCurrentPage(p => Math.min(coachTotalPages, p + 1))}
                        disabled={coachCurrentPage === coachTotalPages}
                      >
                        下一页
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Reset Password Dialog */}
      <Dialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>重置密码: {resetTarget?.username}</DialogTitle></DialogHeader>
          <div className="space-y-2 py-4">
            <Label>新密码</Label>
            <Input value={newPassword} onChange={e => setNewPassword(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsResetDialogOpen(false)}>取消</Button>
            <Button onClick={handleResetPassword} disabled={!newPassword}>确认重置</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function StudentTable({
  students,
  coachName,
  onStatusChange,
  onDelete,
  onResetPassword
}: {
  students: UserData[],
  coachName?: string,
  onStatusChange: (id: number, name: string, status: string) => void,
  onDelete: (id: number, name: string) => void,
  onResetPassword: (id: number, name: string) => void
}) {
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';

    // Default directions
    if (key === 'submissions') {
      direction = 'desc';
    } else if (key === 'createdAt') {
      direction = 'asc';
    } else if (key === 'username') {
      direction = 'asc';
    } else if (key === 'status') {
      direction = 'asc';
    } else if (key === 'displayName') {
      direction = 'asc';
    }

    if (sortConfig && sortConfig.key === key) {
      direction = sortConfig.direction === 'asc' ? 'desc' : 'asc';
    }

    setSortConfig({ key, direction });
    setCurrentPage(1); // Reset to first page on sort
  };

  const sortedStudents = [...students].sort((a, b) => {
    if (!sortConfig) return 0;

    const { key, direction } = sortConfig;

    if (key === 'username') {
      return direction === 'asc'
        ? a.username.localeCompare(b.username)
        : b.username.localeCompare(a.username);
    }

    if (key === 'displayName') {
      // Pinyin sort: zh-CN
      const valA = a.displayName || '';
      const valB = b.displayName || '';
      return direction === 'asc'
        ? valA.localeCompare(valB, 'zh-CN')
        : valB.localeCompare(valA, 'zh-CN');
    }

    if (key === 'submissions') {
      return direction === 'asc'
        ? a._count.submissions - b._count.submissions
        : b._count.submissions - a._count.submissions;
    }

    if (key === 'status') {
      const getRank = (s: string | undefined) => {
        if (s === 'PENDING') return 0;
        if (s === 'DISABLED') return 1;
        return 2; // ACTIVE
      };

      const rankA = getRank(a.status);
      const rankB = getRank(b.status);

      return direction === 'asc'
        ? rankA - rankB
        : rankB - rankA;
    }

    if (key === 'createdAt') {
      return direction === 'asc'
        ? new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }

    return 0;
  });

  // Pagination
  const totalPages = Math.ceil(sortedStudents.length / itemsPerPage);
  const paginatedStudents = sortedStudents.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="border rounded-md bg-white w-full">
      <div className="overflow-x-auto w-full">
        <table className="w-full text-sm text-left table-fixed">
          <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
            <tr>
              <th
                className="w-32 px-4 py-3 cursor-pointer hover:bg-gray-100 select-none"
                onClick={() => handleSort('username')}
                title="点击排序"
              >
                账号ID {sortConfig?.key === 'username' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </th>
              <th
                className="w-40 px-4 py-3 cursor-pointer hover:bg-gray-100 select-none"
                onClick={() => handleSort('displayName')}
                title="点击排序 (按拼音)"
              >
                用户昵称 {sortConfig?.key === 'displayName' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </th>
              <th
                className="w-24 px-4 py-3 cursor-pointer hover:bg-gray-100 select-none"
                onClick={() => handleSort('status')}
                title="点击排序"
              >
                状态 {sortConfig?.key === 'status' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </th>
              <th
                className="w-24 px-4 py-3 cursor-pointer hover:bg-gray-100 select-none"
                onClick={() => handleSort('submissions')}
                title="点击排序"
              >
                做题数 {sortConfig?.key === 'submissions' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </th>
              <th
                className="w-32 px-4 py-3 cursor-pointer hover:bg-gray-100 select-none"
                onClick={() => handleSort('createdAt')}
                title="点击排序"
              >
                注册时间 {sortConfig?.key === 'createdAt' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </th>
              <th className="w-20 px-4 py-3 text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {paginatedStudents.map(s => (
              <tr key={s.id} className="hover:bg-gray-50/50">
                <td className="px-4 py-3 font-medium truncate" title={s.username}>{s.username}</td>
                <td className="px-4 py-3 truncate" title={s.displayName || ''}>{s.displayName || '-'}</td>
                <td className="px-4 py-3">
                  {s.status === 'PENDING' ? (
                    <span className="text-yellow-600 bg-yellow-50 px-2 py-0.5 rounded text-xs">待激活</span>
                  ) : s.status === 'DISABLED' ? (
                    <span className="text-red-600 bg-red-50 px-2 py-0.5 rounded text-xs">已禁用</span>
                  ) : (
                    <span className="text-green-600 bg-green-50 px-2 py-0.5 rounded text-xs">正常</span>
                  )}
                </td>
                <td className="px-4 py-3">{s._count.submissions}</td>
                <td className="px-4 py-3 text-gray-500">
                  {new Date(s.createdAt).toLocaleDateString()}
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
                      <DropdownMenuItem onClick={() => onResetPassword(s.id, s.username)}>
                        <KeyRound className="mr-2 h-4 w-4" />
                        <span>重置密码</span>
                      </DropdownMenuItem>

                      {s.status === 'PENDING' && (
                        <DropdownMenuItem onClick={() => onStatusChange(s.id, s.username, 'ACTIVE')} className="text-green-600">
                          <CheckCircle className="mr-2 h-4 w-4" />
                          <span>激活账号</span>
                        </DropdownMenuItem>
                      )}

                      {s.status === 'ACTIVE' && (
                        <DropdownMenuItem onClick={() => onStatusChange(s.id, s.username, 'DISABLED')} className="text-orange-600">
                          <Ban className="mr-2 h-4 w-4" />
                          <span>禁用账号</span>
                        </DropdownMenuItem>
                      )}

                      {s.status === 'DISABLED' && (
                        <DropdownMenuItem onClick={() => onStatusChange(s.id, s.username, 'ACTIVE')} className="text-green-600">
                          <CheckCircle className="mr-2 h-4 w-4" />
                          <span>启用账号</span>
                        </DropdownMenuItem>
                      )}

                      <DropdownMenuItem onClick={() => onDelete(s.id, s.username)} className="text-red-600 focus:text-red-600 focus:bg-red-50">
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

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t">
          <div className="text-sm text-gray-500">
            第 {currentPage} / {totalPages} 页 (共 {students.length} 条)
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              上一页
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              下一页
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}