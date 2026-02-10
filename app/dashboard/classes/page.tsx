'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, Input, Button, Label } from '@/components/ui'
import { Plus, Users, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { useToast } from '@/components/Toast'

type ClassData = {
  id: number
  name: string
  _count: {
    students: number
  }
}

export default function ClassesPage() {
  const toast = useToast()
  const [classes, setClasses] = useState<ClassData[]>([])
  const [loading, setLoading] = useState(true)
  const [newClassName, setNewClassName] = useState('')
  const [creating, setCreating] = useState(false)

  const fetchClasses = async () => {
    try {
      const res = await fetch('/api/classes')
      if (res.ok) {
        setClasses(await res.json())
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchClasses()
  }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newClassName.trim()) return
    setCreating(true)
    try {
      const res = await fetch('/api/classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newClassName }),
      })
      if (res.ok) {
        setNewClassName('')
        fetchClasses()
        toast.showSuccess('班级创建成功')
      } else {
        toast.showError('创建失败，可能是班级名称重复')
      }
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold tracking-tight text-gray-800">班级管理</h2>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Create Class */}
        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Plus className="w-5 h-5" /> 新建班级
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label>班级名称</Label>
                <Input 
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  placeholder="例如：一年级二班"
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={creating}>
                {creating ? '创建中...' : '创建班级'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Class List */}
        <div className="md:col-span-2 grid gap-4 sm:grid-cols-2">
          {loading ? (
            <div className="col-span-2 text-center text-gray-500 py-8">加载中...</div>
          ) : classes.length === 0 ? (
             <div className="col-span-2 text-center text-gray-500 py-8">暂无班级</div>
          ) : (
            classes.map(cls => (
              <Card key={cls.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6 flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-lg text-gray-800">{cls.name}</h3>
                    <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                      <Users className="w-4 h-4" /> {cls._count.students} 名学生
                    </p>
                  </div>
                  <Link href={`/dashboard/classes/${cls.id}`}>
                    <Button variant="outline" size="sm">
                      管理 <ArrowRight className="ml-1 w-4 h-4" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
