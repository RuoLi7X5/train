import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export const runtime = 'edge';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session || (session.user.role !== 'SUPER_ADMIN' && session.user.role !== 'COACH')) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const { status, feedback } = await request.json()

  try {
    const submissionId = parseInt(id)
    
    // Check ownership for Coach
    if (session.user.role === 'COACH') {
        const submission = await prisma.submission.findUnique({
            where: { id: submissionId },
            include: { problem: true }
        })
        
        if (!submission) {
            return NextResponse.json({ message: 'Submission not found' }, { status: 404 })
        }
        
        if (submission.problem.authorId !== session.user.id) {
            return NextResponse.json({ message: 'Forbidden: Can only grade own problems' }, { status: 403 })
        }
    }

    const submission = await prisma.submission.update({
      where: { id: parseInt(id) },
      data: {
        status,
        feedback,
      },
    })
    return NextResponse.json(submission)
  } catch (error) {
    return NextResponse.json({ message: 'Update failed' }, { status: 500 })
  }
}
