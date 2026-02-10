import { NextResponse } from 'next/server'
import prisma, { problemPushModel } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

/**
 * GET /api/problems/[id]
 * 获取单个题目详情
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await params
    const problemId = parseInt(id)

    if (isNaN(problemId)) {
      return NextResponse.json({ message: '无效的题目ID' }, { status: 400 })
    }

    const problem = await prisma.problem.findUnique({
      where: { id: problemId },
      include: {
        _count: {
          select: { submissions: true }
        }
      }
    })

    if (!problem) {
      return NextResponse.json({ message: '题目不存在' }, { status: 404 })
    }

    // 权限检查：草稿只能作者自己看到
    if (problem.isDraft) {
      if (session.user.role === 'STUDENT') {
        return NextResponse.json({ message: '无权访问草稿' }, { status: 403 })
      }
      if (session.user.role === 'COACH' && problem.authorId !== session.user.id) {
        return NextResponse.json({ message: '无权访问他人草稿' }, { status: 403 })
      }
    }

    return NextResponse.json(problem)
  } catch (error) {
    console.error('Error fetching problem:', error)
    return NextResponse.json({ message: 'Error fetching problem' }, { status: 500 })
  }
}

/**
 * PUT /api/problems/[id]
 * 更新题目（包括编辑草稿、发布草稿、编辑已发布题目）
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session || (session.user.role !== 'COACH' && session.user.role !== 'SUPER_ADMIN')) {
    return NextResponse.json({ message: '只有教练或管理员可以编辑题目' }, { status: 401 })
  }

  try {
    const { id } = await params
    const problemId = parseInt(id)

    if (isNaN(problemId)) {
      return NextResponse.json({ message: '无效的题目ID' }, { status: 400 })
    }

    // 检查题目是否存在
    const existing = await prisma.problem.findUnique({
      where: { id: problemId }
    })

    if (!existing) {
      return NextResponse.json({ message: '题目不存在' }, { status: 404 })
    }

    // 权限检查：只能编辑自己创建的题目（超级管理员例外）
    if (existing.authorId !== session.user.id && session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ message: '无权编辑此题目' }, { status: 403 })
    }

    const { 
      publishAt, 
      content, 
      imageUrl, 
      answerContent, 
      answerImageUrl, 
      answerReleaseHours, 
      isDraft,
      pushToStudents,
      selectedClasses,
      selectedStudents,
      pushDueAt,
      boardData,
      placementMode,
      firstPlayer,
      answerMoves
    } = await request.json()

    // 验证必填字段
    if (!publishAt || !content) {
      return NextResponse.json({ message: '发布时间和内容必填' }, { status: 400 })
    }

    const publishDate = new Date(publishAt)
    if (Number.isNaN(publishDate.getTime())) {
      return NextResponse.json({ message: '发布时间格式无效' }, { status: 400 })
    }

    const date = publishDate.toISOString().split('T')[0]

    // 如果修改了日期，检查是否与其他题目冲突（排除自己）
    if (date !== existing.date) {
      const conflicting = await prisma.problem.findFirst({
        where: { 
          date,
          authorId: session.user.id,
          id: { not: problemId }
        }
      })

      if (conflicting) {
        return NextResponse.json({ message: '该日期已有其他题目' }, { status: 400 })
      }
    }

    let releaseHours = Number(answerReleaseHours)
    if (!releaseHours || (releaseHours !== 24 && (releaseHours < 1 || releaseHours > 12))) {
      releaseHours = 24
    }

    const releaseDate = new Date(publishDate.getTime() + releaseHours * 60 * 60 * 1000).toISOString()

    // 更新题目
    const problem = await prisma.problem.update({
      where: { id: problemId },
      data: {
        date,
        publishAt: publishDate.toISOString(),
        content,
        imageUrl: imageUrl || null,
        answerContent: answerContent || null,
        answerImage: answerImageUrl || null,
        answerReleaseDate: releaseDate,
        isDraft: isDraft === true,
        boardData: boardData || null,
        placementMode: placementMode || null,
        firstPlayer: firstPlayer || null,
        answerMoves: answerMoves || null
      }
    })

    // 处理推送（仅当题目从草稿变为发布时，或更新推送设置时）
    let pushedCount = 0
    if (pushToStudents && !isDraft) {
      if (!pushDueAt) {
        return NextResponse.json({ message: '推送时必须设置截止时间' }, { status: 400 })
      }
      const dueDate = new Date(pushDueAt)
      if (Number.isNaN(dueDate.getTime())) {
        return NextResponse.json({ message: '截止时间格式无效' }, { status: 400 })
      }

      // 收集所有需要推送的学生ID
      const targetStudentIds = new Set<number>()

      // 1. 添加选中的学生
      if (selectedStudents && Array.isArray(selectedStudents)) {
        selectedStudents.forEach((id: number) => targetStudentIds.add(id))
      }

      // 2. 添加选中班级的所有学生
      if (selectedClasses && Array.isArray(selectedClasses) && selectedClasses.length > 0) {
        const classStudents = await prisma.user.findMany({
          where: {
            role: 'STUDENT',
            coachId: session.user.id,
            classId: { in: selectedClasses }
          },
          select: { id: true }
        })
        classStudents.forEach((student) => targetStudentIds.add(student.id))
      }

      // 3. 创建或更新推送记录
      if (targetStudentIds.size > 0) {
        // 删除旧的推送记录（如果有）
        await problemPushModel.deleteMany({
          where: { problemId: problem.id }
        })

        // 创建新的推送记录
        const result = await problemPushModel.createMany({
          data: Array.from(targetStudentIds).map((studentId) => ({
            problemId: problem.id,
            studentId,
            coachId: session.user.id,
            dueAt: dueDate.toISOString()
          })),
          skipDuplicates: true
        })
        pushedCount = result.count
      }
    }

    return NextResponse.json({ 
      problem, 
      pushedCount,
      message: isDraft ? '草稿已更新' : '题目已更新'
    })
  } catch (error) {
    console.error('Error updating problem:', error)
    return NextResponse.json({ message: 'Error updating problem' }, { status: 500 })
  }
}

/**
 * DELETE /api/problems/[id]
 * 删除题目（主要用于删除草稿）
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session || (session.user.role !== 'COACH' && session.user.role !== 'SUPER_ADMIN')) {
    return NextResponse.json({ message: '只有教练或管理员可以删除题目' }, { status: 401 })
  }

  try {
    const { id } = await params
    const problemId = parseInt(id)

    if (isNaN(problemId)) {
      return NextResponse.json({ message: '无效的题目ID' }, { status: 400 })
    }

    // 检查题目是否存在
    const existing = await prisma.problem.findUnique({
      where: { id: problemId },
      include: {
        _count: {
          select: { 
            submissions: true,
            pushes: true 
          }
        }
      }
    })

    if (!existing) {
      return NextResponse.json({ message: '题目不存在' }, { status: 404 })
    }

    // 权限检查：只能删除自己创建的题目（超级管理员例外）
    if (existing.authorId !== session.user.id && session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ message: '无权删除此题目' }, { status: 403 })
    }

    // 安全检查：如果题目已有提交记录，不建议删除
    if (existing._count.submissions > 0) {
      return NextResponse.json({ 
        message: '该题目已有学生提交记录，不建议删除。建议设为草稿或归档。',
        submissionsCount: existing._count.submissions
      }, { status: 400 })
    }

    // 删除相关的推送记录
    if (existing._count.pushes > 0) {
      await problemPushModel.deleteMany({
        where: { problemId: problemId }
      })
    }

    // 删除题目
    await prisma.problem.delete({
      where: { id: problemId }
    })

    return NextResponse.json({ 
      message: '题目已删除',
      id: problemId
    })
  } catch (error) {
    console.error('Error deleting problem:', error)
    return NextResponse.json({ message: 'Error deleting problem' }, { status: 500 })
  }
}
