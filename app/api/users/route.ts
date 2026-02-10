import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { hash } from 'bcrypt-ts'
import { getSession } from '@/lib/auth'
import { Role, UserStatus } from '@prisma/client'

export async function GET(request: Request) {
  const session = await getSession()
  if (!session || (session.user.role !== 'SUPER_ADMIN' && session.user.role !== 'COACH')) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const view = searchParams.get('view') // 'hierarchy' | 'unbound' | default
  const search = searchParams.get('search')

  try {
    // Case 1: Super Admin Hierarchy View (Coach -> Students)
    if (session.user.role === 'SUPER_ADMIN' && view === 'hierarchy') {
       // 1. 获取所有教练
       const coaches = await prisma.user.findMany({
         where: { role: 'COACH' },
         select: {
           id: true,
           username: true,
           displayName: true,
           // 为了性能，我们不在这里深层嵌套查询所有学生
           // 我们只在前端展示时按需查询，或者这里稍微简化
         },
         orderBy: { createdAt: 'desc' }
       })

       // 2. 获取所有学生，并包含 coachId
       // 如果学生太多，这里可能会慢，但对于初期是OK的
       // 更好的做法是前端只展示教练列表，展开时再去请求该教练的学生 (API: /api/classes/[id]/students?coachId=...)
       // 但根据需求，我们暂时先一次性查出来，在内存里组装，或者用更简单的查询
       const allStudents = await prisma.user.findMany({
         where: { 
            role: 'STUDENT',
            ...(search ? {
                OR: [
                    { username: { contains: search } },
                    { displayName: { contains: search } }
                ]
            } : {})
         },
         select: {
            id: true,
            username: true,
            displayName: true,
            status: true,
            createdAt: true,
            coachId: true,
            _count: { select: { submissions: true } }
         },
         orderBy: { createdAt: 'desc' }
       })

       // 3. 在内存中分组，避免复杂的数据库 Join 导致超时
       const groupedCoaches = coaches.map((coach: any) => ({
           ...coach,
           students: allStudents.filter((s: any) => s.coachId === coach.id)
       }))

       const unboundStudents = allStudents.filter((s: any) => !s.coachId)

       return NextResponse.json({
         grouped: groupedCoaches,
         unbound: unboundStudents
       })
    }

    // Case 2: Search Unbound Students (For Coach to add existing student)
    if (session.user.role === 'COACH' && view === 'unbound') {
        if (!search || search.length < 3) {
            return NextResponse.json([])
        }
        const students = await prisma.user.findMany({
            where: {
                role: 'STUDENT',
                coachId: null, // Only show unbound students
                username: { startsWith: 'R', contains: search }
            },
            take: 10,
            select: {
                id: true,
                username: true,
                displayName: true
            }
        })
        return NextResponse.json(students)
    }

    // Case 3: Default List View (Backwards Compatible)
    let whereClause: any = {}
    
    if (session.user.role === 'SUPER_ADMIN') {
      // 超级管理员管理教练 (Default behavior for /dashboard/coaches)
      whereClause = { role: 'COACH' }
    } else {
      // 教练管理自己的学生
      whereClause = { 
        role: 'STUDENT',
        coachId: session.user.id
      }
    }

    if (search) {
        whereClause.OR = [
            { username: { contains: search } },
            { displayName: { contains: search } }
        ]
    }

    const users = await prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        username: true,
        displayName: true,
        createdAt: true,
        status: true, // Show status
        _count: {
          select: { submissions: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })
    return NextResponse.json(users)

  } catch (error) {
    console.error(error)
    return NextResponse.json({ message: 'Error fetching users' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const session = await getSession()
  if (!session || (session.user.role !== 'SUPER_ADMIN' && session.user.role !== 'COACH')) {
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

    const hashedPassword = await hash(password, 10)

    // Determine role and relationship based on creator
    let newRole = 'STUDENT'
    let coachId = null
    
    if (session.user.role === 'SUPER_ADMIN') {
      newRole = 'COACH'
    } else {
      newRole = 'STUDENT'
      coachId = session.user.id
    }

    const newUser = await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
        displayName: displayName || username,
        role: newRole as Role,
        coachId: coachId,
        status: UserStatus.ACTIVE
      },
      select: {
        id: true,
        username: true,
        displayName: true,
        createdAt: true,
        role: true
      }
    })

    return NextResponse.json(newUser)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ message: 'Error creating user' }, { status: 500 })
  }
}
