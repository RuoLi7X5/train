import Link from 'next/link'
import { LayoutDashboard, BookOpen, CheckSquare, Users, LogOut, User, Home } from 'lucide-react'
import { logout, getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSession()

  if (!session) {
    redirect('/api/auth/logout')
  }

  const isSuperAdmin = session?.user?.role === 'SUPER_ADMIN'

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="w-64 bg-white shadow-md flex flex-col">
        <div className="p-6 border-b">
          <h1 className="text-xl font-bold text-blue-600 flex items-center gap-2">
            <LayoutDashboard className="w-6 h-6" />
            管理后台
          </h1>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {/* 返回首页入口 */}
          <div className="pb-2 mb-2 border-b border-gray-100">
            <Link
              href="/"
              className="flex items-center gap-3 px-4 py-3 text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors font-bold"
            >
              <Home size={20} />
              返回做题首页
            </Link>
          </div>

          <NavLink href="/dashboard" icon={<LayoutDashboard size={20} />}>
            概览统计
          </NavLink>
          <NavLink href="/dashboard/problems" icon={<BookOpen size={20} />}>
            每日一题
          </NavLink>
          {isSuperAdmin && (
            <NavLink href="/dashboard/problem-bank" icon={<BookOpen size={20} />}>
              题库总览
            </NavLink>
          )}
          <NavLink href="/dashboard/submissions" icon={<CheckSquare size={20} />}>
            提交批改
          </NavLink>
          <NavLink href="/dashboard/classes" icon={<Users size={20} />}>
            班级管理
          </NavLink>

          {isSuperAdmin && (
            <NavLink href="/dashboard/coaches" icon={<Users size={20} />}>
              教练管理
            </NavLink>
          )}

          <NavLink href="/dashboard/students" icon={<Users size={20} />}>
            {isSuperAdmin ? '棋手管理' : '学生账号'}
          </NavLink>

          <div className="pt-4 mt-4 border-t border-gray-200">
            <NavLink href="/profile" icon={<User size={20} />}>
              个人中心
            </NavLink>
          </div>
        </nav>

        <div className="p-4 border-t">
          <form action={async () => {
            'use server'
            await logout()
            redirect('/login')
          }}>
            <button className="flex items-center gap-3 px-4 py-2 w-full text-gray-600 hover:bg-red-50 hover:text-red-600 rounded-md transition-colors">
              <LogOut size={20} />
              退出登录
            </button>
          </form>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-8">
        {children}
      </main>
    </div>
  )
}

function NavLink({ href, icon, children }: { href: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-md transition-colors font-medium"
    >
      {icon}
      {children}
    </Link>
  )
}
