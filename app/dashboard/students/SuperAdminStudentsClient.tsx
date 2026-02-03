'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, Input, Button, Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui'
import { User, Search, KeyRound, UserMinus, ShieldAlert } from 'lucide-react'

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

export default function SuperAdminStudentsClient() {
  const [data, setData] = useState<HierarchyData>({ grouped: [], unbound: [] })
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  const fetchHierarchy = async () => {
    setLoading(true)
    try {
      const url = searchTerm
        ? `/api/users?view=hierarchy&search=${encodeURIComponent(searchTerm)}`
        : '/api/users?view=hierarchy'

      const res = await fetch(url)
      if (res.ok) {
        const json = await res.json()
        setData(json)
      }
    } catch (error) {
      console.error('Failed to fetch hierarchy', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Debounce search
    const timer = setTimeout(() => {
      fetchHierarchy()
    }, 500)
    return () => clearTimeout(timer)
  }, [searchTerm])

  // Reuse logic for reset password / unbind if needed by Super Admin?
  // Currently Super Admin can reset ANYONE'S password, so we can reuse similar logic.
  // For simplicity, I'll keep it read-only for now or add simple buttons.

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
        </div>
      </div>

      {loading ? (
        <div className="text-center py-10 text-gray-500">加载中...</div>
      ) : (
        <div className="space-y-8">
          {/* Unbound Students Section */}
          {data.unbound.length > 0 && (
            <Card className="border-orange-200 bg-orange-50/30">
              <CardHeader>
                <CardTitle className="text-orange-700 flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5" />
                  未绑定/游离账号 ({data.unbound.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <StudentTable students={data.unbound} />
              </CardContent>
            </Card>
          )}

          {/* Grouped by Coach Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-700">按教练分组</h3>
            {data.grouped.length === 0 ? (
              <div className="text-gray-500 italic">暂无教练数据</div>
            ) : (
              <Accordion type="multiple" className="w-full space-y-2">
                {data.grouped.map(coach => (
                  <AccordionItem key={coach.id} value={`coach-${coach.id}`} className="border rounded-lg bg-white px-4">
                    <AccordionTrigger className="hover:no-underline py-4">
                      <div className="flex items-center gap-4 w-full">
                        <span className="font-semibold text-lg">{coach.displayName || coach.username}</span>
                        <span className="text-sm text-gray-500 font-normal">
                          (用户名: {coach.username})
                        </span>
                        <span className="ml-auto mr-4 text-sm bg-blue-100 text-blue-700 px-3 py-1 rounded-full">
                          学员: {coach.students.length}
                        </span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pt-2 pb-4">
                      {coach.students.length > 0 ? (
                        <StudentTable students={coach.students} coachName={coach.displayName || coach.username} />
                      ) : (
                        <div className="text-gray-400 py-2 text-center text-sm">暂无学员</div>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function StudentTable({ students, coachName }: { students: UserData[], coachName?: string }) {
  return (
    <div className="overflow-x-auto border rounded-md bg-white">
      <table className="w-full text-sm text-left">
        <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
          <tr>
            <th className="px-4 py-3">用户名</th>
            <th className="px-4 py-3">显示名称</th>
            <th className="px-4 py-3">状态</th>
            <th className="px-4 py-3">做题数</th>
            <th className="px-4 py-3">注册时间</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {students.map(s => (
            <tr key={s.id} className="hover:bg-gray-50/50">
              <td className="px-4 py-3 font-medium">{s.username}</td>
              <td className="px-4 py-3">{s.displayName || '-'}</td>
              <td className="px-4 py-3">
                {s.status === 'PENDING' ? (
                  <span className="text-yellow-600 bg-yellow-50 px-2 py-0.5 rounded text-xs">待激活</span>
                ) : (
                  <span className="text-green-600 bg-green-50 px-2 py-0.5 rounded text-xs">正常</span>
                )}
              </td>
              <td className="px-4 py-3">{s._count.submissions}</td>
              <td className="px-4 py-3 text-gray-500">
                {new Date(s.createdAt).toLocaleDateString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}