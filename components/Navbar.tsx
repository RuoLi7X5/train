'use client'

import Link from 'next/link'
import { GraduationCap, LogOut, User } from 'lucide-react'
import { logoutAction } from '@/app/actions'

export default function Navbar({ user }: { user: any }) {
  const handleLogout = async () => {
    await logoutAction()
  }

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 font-bold text-xl text-blue-600">
            <GraduationCap className="w-6 h-6" />
            <span>每日打卡</span>
          </Link>
          
          <nav className="hidden md:flex items-center gap-4 text-sm font-medium text-gray-600">
            <Link href="/" className="hover:text-blue-600 transition-colors">首页</Link>
            <Link href="/problems" className="hover:text-blue-600 transition-colors">每日一题</Link>
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <User className="w-4 h-4" />
            <div className="flex flex-col items-end leading-tight">
                <span className="font-medium">{user?.displayName || user?.username}</span>
                {user?.class && <span className="text-xs text-blue-600 bg-blue-50 px-1.5 rounded">{user.class.name}</span>}
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
            title="退出登录"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  )
}
