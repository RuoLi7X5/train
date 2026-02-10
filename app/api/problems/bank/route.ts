import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function GET() {
  const session = await getSession()
  if (!session || session.user.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  try {
    const coaches = await prisma.user.findMany({
      where: { role: 'COACH' },
      select: {
        id: true,
        username: true,
        displayName: true,
        createdProblems: {
          orderBy: [{ publishAt: 'desc' }, { date: 'desc' }],
          select: {
            id: true,
            date: true,
            publishAt: true,
            content: true,
            imageUrl: true,
            answerReleaseDate: true,
            _count: { select: { submissions: true } }
          }
        }
      }
    })

    const unassigned = await prisma.problem.findMany({
      where: { authorId: null },
      orderBy: [{ publishAt: 'desc' }, { date: 'desc' }],
      select: {
        id: true,
        date: true,
        publishAt: true,
        content: true,
        imageUrl: true,
        answerReleaseDate: true,
        _count: { select: { submissions: true } }
      }
    })

    return NextResponse.json({ coaches, unassigned })
  } catch (error) {
    console.error('Error fetching bank:', error)
    return NextResponse.json({ message: 'Error fetching bank' }, { status: 500 })
  }
}
