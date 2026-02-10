'use client'

import { useState } from 'react'
import Link from 'next/link'
import { GraduationCap, LogOut, User, LayoutDashboard, Eye, Settings } from 'lucide-react'
import { logoutAction } from '@/app/actions'

export default function Navbar({ user }: { user: any }) {
  const [showUserMenu, setShowUserMenu] = useState(false)
  
  const handleLogout = async () => {
    await logoutAction()
  }

  const isCoachOrAdmin = user?.role === 'COACH' || user?.role === 'SUPER_ADMIN'

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
          {/* 管理后台入口 (仅教练/管理员可见) */}
          {isCoachOrAdmin && (
            <Link
              href="/dashboard"
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-gray-900 text-white text-xs font-bold rounded-full hover:bg-gray-700 transition-colors shadow-sm"
            >
              <LayoutDashboard className="w-3 h-3" />
              进入管理后台
            </Link>
          )}

          {/* User Menu */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 text-sm text-gray-600 hover:bg-gray-100 px-2 py-1 rounded-md transition-colors"
            >
              <User className="w-4 h-4" />
              <div className="flex flex-col items-end leading-tight">
                <span className="font-medium">{user?.displayName || user?.username}</span>
                {user?.class && <span className="text-xs text-blue-600 bg-blue-50 px-1.5 rounded">{user.class.name}</span>}
              </div>
            </button>

            {/* Dropdown Menu */}
            {showUserMenu && (
              <>
                <div 
                  className="fixed inset-0 z-10" 
                  onClick={() => setShowUserMenu(false)}
                />
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                  <Link
                    href={`/u/${user?.id}`}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                    onClick={() => setShowUserMenu(false)}
                  >
                    <Eye className="w-4 h-4" />
                    我的主页
                  </Link>
                  <Link
                    href="/profile"
                    className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                    onClick={() => setShowUserMenu(false)}
                  >
                    <Settings className="w-4 h-4" />
                    个人设置
                  </Link>
                  <div className="border-t border-gray-200 my-1" />
                  <button
                    onClick={() => {
                      setShowUserMenu(false)
                      handleLogout()
                    }}
                    className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    退出登录
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
