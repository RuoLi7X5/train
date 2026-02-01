import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { getSession } from '@/lib/auth'

export async function GET() {
  const session = await getSession()
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  try {
    const students = await prisma.user.findMany({
      where: { role: 'STUDENT' },
      select: {
        id: true,
        username: true,
        displayName: true,
        createdAt: true,
        _count: {
          select: { submissions: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })
    return NextResponse.json(students)
  } catch (error) {
    return NextResponse.json({ message: 'Error fetching students' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const session = await getSession()
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { username, password, displayName } = await request.json()

    if (!username || !password) {
      return NextResponse.json({ message: '用户名和密码必填' }, { status: 400 })
    }

    const existingUser = await prisma.user.findUnique({
      where: { username }
    })

    if (existingUser) {
      return NextResponse.json({ message: '用户名已存在' }, { status: 400 })
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const newUser = await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
        displayName: displayName || username, // 如果没有昵称，使用用户名
        role: 'STUDENT'
      },
      select: {
        id: true,
        username: true,
        displayName: true,
        createdAt: true
      }
    })

    return NextResponse.json(newUser)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ message: 'Error creating user' }, { status: 500 })
  }
}
