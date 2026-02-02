import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import bcrypt from 'bcryptjs'
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

    // 自动初始化管理员账号 (只要用户不存在且尝试使用默认账号密码)
    if (!user && username === 'ruoli' && password === 'ruoli') {
      // 无论是否有其他用户，只要 ruoli 不存在，就允许初始化
      const hashedPassword = await bcrypt.hash(password, 10)
      user = await prisma.user.create({
        data: {
          username: 'ruoli',
          password: hashedPassword,
          role: 'ADMIN',
          displayName: '管理员',
        },
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

    // 验证密码
    const isValid = await bcrypt.compare(password, user.password)

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
      role: user.role,
      displayName: user.displayName,
      class: user.class
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
