'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, Button, Input } from '@/components/ui'
import { Users, UserPlus, UserMinus, Search, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useToast } from '@/components/Toast'

type Student = {
  id: number
  username: string
  displayName: string | null
}

export default function ClassDetailPage() {
  const toast = useToast()
  const params = useParams()
  const classId = params.id as string
  
  const [currentStudents, setCurrentStudents] = useState<Student[]>([])
  const [availableStudents, setAvailableStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [searchTerm, setSearchTerm] = useState('')

  const fetchData = async () => {
    setLoading(true)
    try {
      const [currentRes, availableRes] = await Promise.all([
        fetch(`/api/classes/${classId}/students`),
        fetch(`/api/classes/${classId}/students?mode=available`)
      ])
      
      if (currentRes.ok) setCurrentStudents(await currentRes.json())
      if (availableRes.ok) setAvailableStudents(await availableRes.json())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [classId])

  const handleAction = async (action: 'add' | 'remove') => {
    if (selectedIds.length === 0) return

    try {
      const res = await fetch(`/api/classes/${classId}/students`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentIds: selectedIds, action }),
      })

      if (res.ok) {
        setSelectedIds([])
        setShowAddModal(false)
        fetchData()
      } else {
        toast.showError('操作失败')
      }
    } catch (error) {
      toast.showError('操作出错')
    }
  }

  const toggleSelection = (id: number) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  const filteredAvailable = availableStudents.filter(s => 
    s.username.includes(searchTerm) || (s.displayName && s.displayName.includes(searchTerm))
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/classes">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-1" /> 返回
          </Button>
        </Link>
        <h2 className="text-3xl font-bold tracking-tight text-gray-800">班级成员管理</h2>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Current Members */}
        <Card className="h-full">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="w-5 h-5" /> 现有成员 ({currentStudents.length})
            </CardTitle>
            <Button 
              variant="destructive" 
              size="sm" 
              disabled={selectedIds.length === 0 || showAddModal}
              onClick={() => handleAction('remove')}
            >
              <UserMinus className="w-4 h-4 mr-1" /> 移出班级
            </Button>
          </CardHeader>
          <CardContent>
            <div className="border rounded-md divide-y max-h-[500px] overflow-y-auto">
              {currentStudents.length === 0 ? (
                <div className="p-4 text-center text-gray-500">暂无成员</div>
              ) : (
                currentStudents.map(s => (
                  <div 
                    key={s.id} 
                    className={`p-3 flex items-center gap-3 cursor-pointer hover:bg-gray-50 ${selectedIds.includes(s.id) && !showAddModal ? 'bg-blue-50' : ''}`}
                    onClick={() => {
                      if (showAddModal) return
                      toggleSelection(s.id)
                    }}
                  >
                    <input 
                      type="checkbox" 
                      checked={selectedIds.includes(s.id) && !showAddModal}
                      onChange={() => {}}
                      className="w-4 h-4"
                    />
                    <div>
                      <div className="font-medium">{s.displayName || s.username}</div>
                      <div className="text-xs text-gray-500">@{s.username}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Add Members Panel */}
        <Card className="h-full border-blue-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between bg-blue-50/50">
            <CardTitle className="text-lg flex items-center gap-2 text-blue-800">
              <UserPlus className="w-5 h-5" /> 添加学生
            </CardTitle>
            <Button 
              size="sm" 
              disabled={selectedIds.length === 0 || !showAddModal}
              onClick={() => handleAction('add')}
            >
              确认添加
            </Button>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                placeholder="搜索学生..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onFocus={() => {
                  setShowAddModal(true)
                  setSelectedIds([]) // Clear selection when switching modes
                }}
              />
            </div>
            
            <div className="border rounded-md divide-y max-h-[420px] overflow-y-auto">
              {filteredAvailable.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  {availableStudents.length === 0 ? '所有学生都已分配班级' : '无匹配学生'}
                </div>
              ) : (
                filteredAvailable.map(s => (
                  <div 
                    key={s.id} 
                    className={`p-3 flex items-center gap-3 cursor-pointer hover:bg-gray-50 ${selectedIds.includes(s.id) && showAddModal ? 'bg-blue-50' : ''}`}
                    onClick={() => {
                      if (!showAddModal) {
                        setShowAddModal(true)
                        setSelectedIds([])
                      }
                      toggleSelection(s.id)
                    }}
                  >
                    <input 
                      type="checkbox" 
                      checked={selectedIds.includes(s.id) && showAddModal}
                      onChange={() => {}}
                      className="w-4 h-4"
                    />
                    <div>
                      <div className="font-medium">{s.displayName || s.username}</div>
                      <div className="text-xs text-gray-500">@{s.username}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
