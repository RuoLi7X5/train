/**
 * Prisma 类型扩展和辅助类型
 * 用于解决 ProblemPush 等模型的类型安全问题
 * 
 * 注意：由于 Prisma 的类型系统限制，某些模型（如 ProblemPush）
 * 需要通过 lib/prisma.ts 中导出的 problemPushModel 来访问
 */

import { PrismaClient } from '@prisma/client'

/**
 * ProblemPush 相关的辅助类型
 */
export type ProblemPushWhereInput = {
  id?: number
  problemId?: number
  studentId?: number
  coachId?: number
  status?: 'ACTIVE' | 'EXPIRED' | 'COMPLETED'
  pushedAt?: Date | { gte?: Date; lte?: Date }
  dueAt?: Date | { gte?: Date; lte?: Date } | null
}

export type ProblemPushCreateInput = {
  problemId: number
  studentId: number
  coachId: number
  dueAt?: string | Date
  status?: 'ACTIVE' | 'EXPIRED' | 'COMPLETED'
}

export type ProblemPushUpdateInput = {
  status?: 'ACTIVE' | 'EXPIRED' | 'COMPLETED'
  dueAt?: string | Date | null
}

export type ProblemPushInclude = {
  problem?: boolean | {
    include?: {
      _count?: boolean | {
        select?: {
          submissions?: boolean
        }
      }
    }
  }
  student?: boolean
  coach?: boolean
}

export type ProblemPushOrderBy = {
  id?: 'asc' | 'desc'
  pushedAt?: 'asc' | 'desc'
  dueAt?: 'asc' | 'desc'
  createdAt?: 'asc' | 'desc'
}
