'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Input, Label, Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui'
import { Loader2, GraduationCap } from 'lucide-react'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const inFlightRef = useRef(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (inFlightRef.current) return
    inFlightRef.current = true
    setIsLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      })

      const text = await res.text()
      const data = text ? JSON.parse(text) : {}
      if (!res.ok) throw new Error(data.message || '登录失败')

      // 登录成功，所有角色统一跳转到首页
      window.location.href = '/'
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
      inFlightRef.current = false
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-50 to-white px-4">
      <Card className="w-full max-w-md shadow-lg border-gray-100">
        <CardHeader className="space-y-2 text-center pb-8">
          <div className="flex justify-center mb-2">
            <div className="p-4 bg-blue-600 rounded-2xl shadow-md transform rotate-3">
              <GraduationCap className="w-10 h-10 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight text-gray-900">每日打卡系统</CardTitle>
          <p className="text-gray-500 text-sm">欢迎回来，请登录您的账号</p>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 text-red-600 text-sm rounded-md border border-red-100 flex items-center justify-center">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="username" className="text-gray-700">账号ID</Label>
              <Input
                id="username"
                placeholder="请输入账号ID (如 R000001)"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-gray-700">密码</Label>
              <Input
                id="password"
                type="password"
                placeholder="请输入密码"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-11"
              />
            </div>
          </CardContent>
          <CardFooter className="pt-4 pb-8">
            <Button className="w-full h-11 text-base shadow-blue-200 shadow-md transition-all hover:shadow-blue-300" type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  登录中...
                </>
              ) : (
                '立即登录'
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
