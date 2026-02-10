import { notFound } from 'next/navigation'
import { User, Calendar, Award, Target, TrendingUp, BookOpen, Users, Clock, CheckCircle, XCircle, Circle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui'

type UserProfile = {
  user: {
    id: number
    username: string
    displayName: string | null
    role: string
    createdAt: string
    class?: { id: number; name: string } | null
    coach?: { id: number; username: string; displayName: string | null } | null
  }
  stats: {
    totalSubmissions: number
    correctSubmissions: number
    correctRate: number
    consecutiveDays: number
    lastSubmissionAt?: string
  }
  problemsCount?: number
  studentsCount?: number
  recentProblems?: Array<{
    id: number
    date: string
    content: string
    visibility: string
    createdAt: string
    _count: { submissions: number }
  }>
  recentSubmissions?: Array<{
    id: number
    status: string
    createdAt: string
    problem: {
      id: number
      content: string
      date: string
    }
  }>
}

async function getUserProfile(id: string): Promise<UserProfile | null> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/users/${id}/profile`, {
      cache: 'no-store'
    })
    
    if (!res.ok) return null
    return await res.json()
  } catch (error) {
    console.error('Failed to fetch user profile:', error)
    return null
  }
}

export default async function PublicProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const profile = await getUserProfile(id)

  if (!profile) {
    notFound()
  }

  const { user, stats } = profile
  const roleLabels = {
    SUPER_ADMIN: '超级管理员',
    COACH: '教练',
    STUDENT: '学生'
  }

  const roleBadgeColors = {
    SUPER_ADMIN: 'bg-purple-100 text-purple-800 border-purple-200',
    COACH: 'bg-blue-100 text-blue-800 border-blue-200',
    STUDENT: 'bg-green-100 text-green-800 border-green-200'
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header Banner */}
      <div className="relative bg-gradient-to-r from-blue-600 to-purple-600 h-48 flex items-end">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative w-full max-w-6xl mx-auto px-4 pb-8">
          <div className="flex items-end gap-6">
            {/* Avatar */}
            <div className="w-32 h-32 rounded-full bg-white shadow-2xl flex items-center justify-center text-4xl font-bold text-blue-600 border-4 border-white">
              {(user.displayName || user.username).charAt(0).toUpperCase()}
            </div>
            
            {/* User Info */}
            <div className="flex-1 pb-2">
              <h1 className="text-3xl font-bold text-white mb-2">
                {user.displayName || user.username}
              </h1>
              <div className="flex items-center gap-3">
                <span className={`px-3 py-1 rounded-full text-sm font-medium border ${roleBadgeColors[user.role as keyof typeof roleBadgeColors]}`}>
                  {roleLabels[user.role as keyof typeof roleLabels]}
                </span>
                <span className="text-blue-100 text-sm flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  加入于 {new Date(user.createdAt).toLocaleDateString('zh-CN')}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-8 -mt-16 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Stats Cards */}
          <Card className="bg-white/90 backdrop-blur-sm shadow-xl hover:shadow-2xl transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">总提交数</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.totalSubmissions}</p>
                </div>
                <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center">
                  <Target className="w-7 h-7 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/90 backdrop-blur-sm shadow-xl hover:shadow-2xl transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">正确率</p>
                  <p className="text-3xl font-bold text-green-600">{stats.correctRate}%</p>
                </div>
                <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
                  <Award className="w-7 h-7 text-green-600" />
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">{stats.correctSubmissions} / {stats.totalSubmissions} 正确</p>
            </CardContent>
          </Card>

          <Card className="bg-white/90 backdrop-blur-sm shadow-xl hover:shadow-2xl transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">连续打卡</p>
                  <p className="text-3xl font-bold text-orange-600">{stats.consecutiveDays}</p>
                  <p className="text-xs text-gray-500 mt-1">天</p>
                </div>
                <div className="w-14 h-14 rounded-full bg-orange-100 flex items-center justify-center">
                  <TrendingUp className="w-7 h-7 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Additional Info Cards */}
        {user.class && (
          <Card className="mb-6 bg-white/90 backdrop-blur-sm shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center">
                  <Users className="w-6 h-6 text-indigo-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">所属班级</p>
                  <p className="text-lg font-semibold text-gray-900">{user.class.name}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {user.coach && (
          <Card className="mb-6 bg-white/90 backdrop-blur-sm shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                  <User className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">指导教练</p>
                  <p className="text-lg font-semibold text-gray-900">{user.coach.displayName || user.coach.username}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Role Specific Content */}
        {(user.role === 'COACH' || user.role === 'SUPER_ADMIN') && profile.recentProblems && (
          <Card className="bg-white/90 backdrop-blur-sm shadow-lg">
            <CardHeader className="border-b">
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-blue-600" />
                出题历史
                <span className="text-sm font-normal text-gray-500 ml-2">
                  (共 {profile.problemsCount} 题{profile.studentsCount !== undefined && ` · ${profile.studentsCount} 位学生`})
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {profile.recentProblems.length === 0 ? (
                <p className="text-gray-500 text-center py-8">暂无公开题目</p>
              ) : (
                <div className="space-y-4">
                  {profile.recentProblems.map((problem) => (
                    <div key={problem.id} className="border-l-4 border-blue-500 pl-4 py-2 hover:bg-gray-50 transition-colors rounded-r">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 line-clamp-2">{problem.content}</p>
                          <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              {problem.date}
                            </span>
                            <span className="flex items-center gap-1">
                              <Target className="w-4 h-4" />
                              {problem._count.submissions} 次提交
                            </span>
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                              problem.visibility === 'COMMUNITY' 
                                ? 'bg-purple-100 text-purple-700' 
                                : 'bg-blue-100 text-blue-700'
                            }`}>
                              {problem.visibility === 'COMMUNITY' ? '公开' : '学生可见'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {user.role === 'STUDENT' && profile.recentSubmissions && (
          <Card className="bg-white/90 backdrop-blur-sm shadow-lg">
            <CardHeader className="border-b">
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-green-600" />
                最近练习记录
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {profile.recentSubmissions.length === 0 ? (
                <p className="text-gray-500 text-center py-8">暂无练习记录</p>
              ) : (
                <div className="space-y-3">
                  {profile.recentSubmissions.map((submission) => (
                    <div key={submission.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <div className="flex-shrink-0">
                        {submission.status === 'CORRECT' && (
                          <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                            <CheckCircle className="w-6 h-6 text-green-600" />
                          </div>
                        )}
                        {submission.status === 'WRONG' && (
                          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                            <XCircle className="w-6 h-6 text-red-600" />
                          </div>
                        )}
                        {submission.status === 'PENDING' && (
                          <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                            <Circle className="w-6 h-6 text-gray-400" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{submission.problem.content}</p>
                        <p className="text-sm text-gray-500">{new Date(submission.createdAt).toLocaleString('zh-CN')}</p>
                      </div>
                      <div className="text-sm text-gray-500">
                        {submission.problem.date}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Last Activity */}
        {stats.lastSubmissionAt && (
          <div className="mt-8 text-center text-sm text-gray-500">
            最后活动时间：{new Date(stats.lastSubmissionAt).toLocaleString('zh-CN')}
          </div>
        )}
      </div>
    </div>
  )
}
