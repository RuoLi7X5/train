import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function GET() {
  const session = await getSession()
  if (!session || (session.user.role !== 'SUPER_ADMIN' && session.user.role !== 'COACH')) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  try {
    let whereClause = {}
    if (session.user.role === 'COACH') {
      whereClause = { coachId: session.user.id }
    }

    const classes = await prisma.class.findMany({
      where: whereClause,
      include: {
        _count: {
          select: { students: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })
    return NextResponse.json(classes)
  } catch (error) {
    return NextResponse.json({ message: 'Error fetching classes' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const session = await getSession()
  if (!session || session.user.role !== 'COACH') {
    return NextResponse.json({ message: 'Unauthorized. Only Coaches can create classes.' }, { status: 401 })
  }

  try {
    const { name } = await request.json()
    if (!name) {
      return NextResponse.json({ message: 'Name is required' }, { status: 400 })
    }

    const newClass = await prisma.class.create({
      data: { 
        name,
        coachId: session.user.id
      }
    })

    return NextResponse.json(newClass)
  } catch (error) {
    return NextResponse.json({ message: 'Error creating class' }, { status: 500 })
  }
}
