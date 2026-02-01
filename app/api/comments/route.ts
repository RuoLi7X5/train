import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export const runtime = 'edge';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const problemId = searchParams.get('problemId')

  if (!problemId) return NextResponse.json([])

  const comments = await prisma.comment.findMany({
    where: { problemId: parseInt(problemId) },
    include: {
      user: { select: { username: true, displayName: true } }
    },
    orderBy: { createdAt: 'desc' }
  })

  return NextResponse.json(comments)
}

export async function POST(request: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  try {
    const { problemId, content, imageUrl } = await request.json()
    
    if (!content && !imageUrl) {
        return NextResponse.json({ message: 'Content or image required' }, { status: 400 })
    }

    const comment = await prisma.comment.create({
      data: {
        content: content || '',
        imageUrl,
        problemId: parseInt(problemId),
        userId: session.user.id
      },
      include: {
        user: { select: { username: true, displayName: true } }
      }
    })
    return NextResponse.json(comment)
  } catch (error) {
    return NextResponse.json({ message: 'Failed' }, { status: 500 })
  }
}
