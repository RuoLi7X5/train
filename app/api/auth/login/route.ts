import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { compare, hash } from 'bcrypt-ts'
import { login } from '@/lib/auth'

export const runtime = 'edge';

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { username, password } = body

    if (!username || !password) {
      return NextResponse.json(
        { message: '用户名和密码不能为空' },
        { status: 400 }
      )
    }

    // 查找用户
    let user = await prisma.user.findUnique({
      where: { username },
      include: { class: true }
    })

    // 自动修复 ruoli 权限 (如果用户存在但角色被重置，且是 ruoli)
    if (user && username === 'ruoli' && (user as any).role !== 'SUPER_ADMIN') {
       try {
         user = await prisma.user.update({
           where: { id: user.id },
           data: { role: 'SUPER_ADMIN' } as any,
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
          role: 'SUPER_ADMIN', // 初始化为超级管理员
          status: 'ACTIVE',
          displayName: '超级管理员',
        } as any,
        include: {
          class: true,
        },
      })
      console.log('自动初始化管理员账号: ruoli')
    }

    if (!user) {
      return NextResponse.json(
        { message: '用户不存在' },
        { status: 401 }
      )
    }

    // 检查用户状态
    if ((user as any).status === 'PENDING') {
      return NextResponse.json(
        { message: '账号待审核或未激活，请联系教练' },
        { status: 403 }
      )
    }
    
    if ((user as any).status === 'DISABLED') {
        return NextResponse.json(
          { message: '账号已被禁用，请联系管理员' },
          { status: 403 }
        )
    }

    // 验证密码
    const isValid = await compare(password, user.password)

    if (!isValid) {
      return NextResponse.json(
        { message: '密码错误' },
        { status: 401 }
      )
    }

    // 登录成功，设置 Session
    // 过滤掉密码字段
    const userWithoutPassword = {
      id: user.id,
      username: user.username,
      role: (user as any).role,
      displayName: user.displayName,
      class: (user as any).class,
      coachId: (user as any).coachId,
      status: (user as any).status
    }

    await login(userWithoutPassword)

    return NextResponse.json({ success: true, user: userWithoutPassword })
  } catch (error) {
    console.error('Login error raw:', error);
    
    let errorMessage = '未知错误';
    try {
      errorMessage = JSON.stringify(error, Object.getOwnPropertyNames(error));
    } catch (e) {
      errorMessage = String(error);
    }

    console.error('Login error stringified:', errorMessage);

    return NextResponse.json(
      { message: `服务器内部错误: ${errorMessage}` },
      { status: 500 }
    )
  }
}
