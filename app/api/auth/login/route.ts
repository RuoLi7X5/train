import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { compare, hash } from 'bcrypt-ts'
import { login } from '@/lib/auth'
import { Role, UserStatus } from '@prisma/client'
import { successResponse, errorResponse, validationErrorResponse, unauthorizedResponse, forbiddenResponse } from '@/lib/api-response'
import { logger } from '@/lib/logger'
import { withPerformanceMonitoring } from '@/lib/monitoring'

async function handleLogin(request: Request) {
  try {
    logger.apiRequest('POST', '/api/auth/login')
    
    const body = await request.json()
    const { username, password } = body

    if (!username || !password) {
      return validationErrorResponse('用户名和密码不能为空')
    }

    // 查找用户
    let user = await prisma.user.findUnique({
      where: { username },
      include: { class: true }
    })

    // 自动修复 ruoli 权限 (如果用户存在但角色被重置，且是 ruoli)
    if (user && username === 'ruoli' && user.role !== 'SUPER_ADMIN') {
       try {
         user = await prisma.user.update({
           where: { id: user.id },
           data: { role: Role.SUPER_ADMIN },
           include: { class: true }
         })
         console.log('自动修复管理员权限: ruoli -> SUPER_ADMIN')
       } catch (e) {
         console.error('自动修复管理员权限失败:', e)
       }
    }

    // 自动初始化管理员账号 (只要用户不存在且尝试使用默认账号密码)
    if (!user && username === 'ruoli' && password === 'ruoli') {
      // 无论是否有其他用户，只要 ruoli 不存在，就允许初始化
      const hashedPassword = await hash(password, 10)
      user = await prisma.user.create({
        data: {
          username: 'ruoli',
          password: hashedPassword,
          role: Role.SUPER_ADMIN, // 初始化为超级管理员
          status: UserStatus.ACTIVE,
          displayName: '超级管理员',
        },
        include: {
          class: true,
        },
      })
      console.log('自动初始化管理员账号: ruoli')
    }

    if (!user) {
      logger.warn('Login failed: user not found', { username })
      return unauthorizedResponse('用户不存在')
    }

    // 检查用户状态
    if (user.status === UserStatus.PENDING) {
      logger.warn('Login failed: account pending', { username })
      return forbiddenResponse('账号待审核或未激活，请联系教练')
    }
    
    if (user.status === UserStatus.DISABLED) {
      logger.warn('Login failed: account disabled', { username })
      return forbiddenResponse('账号已被禁用，请联系管理员')
    }

    // 验证密码
    const isValid = await compare(password, user.password)

    if (!isValid) {
      logger.warn('Login failed: invalid password', { username })
      return unauthorizedResponse('密码错误')
    }

    // 登录成功，设置 Session
    // 过滤掉密码字段
    const userWithoutPassword = {
      id: user.id,
      username: user.username,
      role: user.role,
      displayName: user.displayName,
      class: user.class,
      coachId: user.coachId,
      status: user.status
    }

    await login(userWithoutPassword)

    logger.info('User logged in successfully', { username, role: user.role })
    return successResponse({ user: userWithoutPassword }, '登录成功')
  } catch (error) {
    logger.error('Login error', error as Error, { username: request.headers.get('username') })
    return errorResponse('登录失败，请稍后重试', 500, error)
  }
}

export const POST = withPerformanceMonitoring(handleLogin, '/api/auth/login')
