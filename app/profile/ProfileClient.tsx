'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, Input, Button, Label } from '@/components/ui'
import { User, KeyRound, Loader2, Save, BarChart, Settings } from 'lucide-react'

export default function ProfileClient({ user: initialUser }: { user: any }) {
  const [user, setUser] = useState(initialUser)
  const [passwords, setPasswords] = useState({ new: '', confirm: '' })
  const [loading, setLoading] = useState(false)
  const [displayName, setDisplayName] = useState(user.displayName || user.username)
  const [isEditingName, setIsEditingName] = useState(false)
  const [nameLoading, setNameLoading] = useState(false)

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    if (passwords.new !== passwords.confirm) {
      alert('两次输入的新密码不一致')
      return
    }
    
    setLoading(true)
    try {
        const res = await fetch(`/api/users/${user.id}/password`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: passwords.new })
        })
        
        if (res.ok) {
            alert('密码修改成功')
            setPasswords({ new: '', confirm: '' })
        } else {
            const data = await res.json()
            alert(data.message || '修改失败')
        }
    } catch (e) {
        alert('修改失败')
    } finally {
        setLoading(false)
    }
  }

  const handleNameUpdate = async () => {
    if (!displayName || displayName === user.displayName) {
        setIsEditingName(false)
        return
    }
    setNameLoading(true)
    try {
        const res = await fetch(`/api/users/${user.id}/profile`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ displayName })
        })
        if (res.ok) {
            const data = await res.json()
            setUser({ ...user, displayName: data.user.displayName })
            setIsEditingName(false)
        } else {
            alert('修改失败')
        }
    } catch (e) {
        alert('修改失败')
    } finally {
        setNameLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-4xl">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">个人中心</h1>
        
        <div className="grid md:grid-cols-3 gap-6">
            {/* Left: Profile Card */}
            <Card className="md:col-span-1 h-fit">
                <CardHeader className="text-center">
                    <div className="mx-auto w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                        <User className="w-12 h-12 text-blue-600" />
                    </div>
                    
                    {isEditingName ? (
                        <div className="flex items-center gap-2 justify-center mb-2">
                            <Input 
                                value={displayName} 
                                onChange={e => setDisplayName(e.target.value)}
                                className="h-8 text-center text-lg font-bold w-32 px-1"
                            />
                            <Button size="sm" variant="ghost" onClick={handleNameUpdate} disabled={nameLoading}>
                                <Save className="w-4 h-4" />
                            </Button>
                        </div>
                    ) : (
                        <div className="group flex items-center justify-center gap-2 mb-1 cursor-pointer" onClick={() => setIsEditingName(true)}>
                            <CardTitle className="hover:underline decoration-dashed">{user.displayName || user.username}</CardTitle>
                            <span className="opacity-0 group-hover:opacity-50 text-xs text-gray-400">修改</span>
                        </div>
                    )}

                    <p className="text-sm text-gray-500">@{user.username}</p>
                    <div className="mt-4 flex justify-center gap-2">
                        <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                            {user.role === 'SUPER_ADMIN' ? '超级管理员' : user.role === 'COACH' ? '教练' : '棋手'}
                        </span>
                        <span className={`px-2 py-1 text-xs rounded-full ${user.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                            {user.status === 'ACTIVE' ? '正常' : '待激活'}
                        </span>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3 pt-4 border-t text-sm">
                        {user.class && (
                            <div className="flex justify-between">
                                <span className="text-gray-500">所在班级</span>
                                <span>{user.class.name}</span>
                            </div>
                        )}
                        <div className="flex justify-between">
                            <span className="text-gray-500">账号ID</span>
                            <span className="font-mono">{user.username}</span>
                        </div>
                        {/* 暂未实现 coach 数据传回，如有需要可后续添加 */}
                    </div>
                </CardContent>
            </Card>

            {/* Right: Settings & Stats */}
            <div className="md:col-span-2 space-y-6">
                
                {/* Stats Placeholder */}
                <div className="grid grid-cols-2 gap-4">
                    <Card>
                        <CardContent className="p-4 flex items-center gap-4">
                            <div className="p-3 bg-blue-50 rounded-full">
                                <BarChart className="w-6 h-6 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">累计积分</p>
                                <p className="text-xl font-bold">0</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4 flex items-center gap-4">
                            <div className="p-3 bg-green-50 rounded-full">
                                <CheckCircle className="w-6 h-6 text-green-600" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">打卡天数</p>
                                <p className="text-xl font-bold">0</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <KeyRound className="w-5 h-5" /> 修改密码
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
                            <div className="space-y-2">
                                <Label>新密码</Label>
                                <Input 
                                    type="password" 
                                    value={passwords.new}
                                    onChange={e => setPasswords({...passwords, new: e.target.value})}
                                    required 
                                    minLength={6}
                                    placeholder="至少6位字符"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>确认新密码</Label>
                                <Input 
                                    type="password" 
                                    value={passwords.confirm}
                                    onChange={e => setPasswords({...passwords, confirm: e.target.value})}
                                    required 
                                    minLength={6}
                                    placeholder="再次输入新密码"
                                />
                            </div>
                            <Button type="submit" disabled={loading}>
                                {loading ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : null}
                                确认修改
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {/* Interface Settings Placeholder */}
                <Card className="opacity-60 grayscale cursor-not-allowed relative">
                    <div className="absolute inset-0 flex items-center justify-center z-10">
                        <span className="bg-gray-100 px-3 py-1 rounded text-xs text-gray-500 font-medium">开发中</span>
                    </div>
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Settings className="w-5 h-5" /> 界面设置
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label>主题颜色</Label>
                                <div className="flex gap-2">
                                    <div className="w-8 h-8 rounded-full bg-blue-600 ring-2 ring-offset-2 ring-blue-600"></div>
                                    <div className="w-8 h-8 rounded-full bg-purple-600"></div>
                                    <div className="w-8 h-8 rounded-full bg-orange-600"></div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    </div>
  )
}

import { CheckCircle } from 'lucide-react'