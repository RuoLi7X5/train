import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export const runtime = 'edge';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const { status, feedback } = await request.json()

  try {
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
