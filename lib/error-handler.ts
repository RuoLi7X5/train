/**
 * 统一的错误处理工具
 */

import { Prisma } from '@prisma/client'

/**
 * 应用错误类型
 */
export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message)
    this.name = 'AppError'
  }
}

/**
 * 验证错误
 */
export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400, 'VALIDATION_ERROR')
    this.name = 'ValidationError'
  }
}

/**
 * 未授权错误
 */
export class UnauthorizedError extends AppError {
  constructor(message: string = '未登录或登录已过期') {
    super(message, 401, 'UNAUTHORIZED')
    this.name = 'UnauthorizedError'
  }
}

/**
 * 禁止访问错误
 */
export class ForbiddenError extends AppError {
  constructor(message: string = '无权限访问此资源') {
    super(message, 403, 'FORBIDDEN')
    this.name = 'ForbiddenError'
  }
}

/**
 * 资源未找到错误
 */
export class NotFoundError extends AppError {
  constructor(message: string = '资源不存在') {
    super(message, 404, 'NOT_FOUND')
    this.name = 'NotFoundError'
  }
}

/**
 * 业务逻辑错误
 */
export class BusinessError extends AppError {
  constructor(message: string) {
    super(message, 400, 'BUSINESS_ERROR')
    this.name = 'BusinessError'
  }
}

/**
 * 解析 Prisma 错误并返回友好的错误消息
 */
export function parsePrismaError(error: any): { message: string; statusCode: number } {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002':
        // 唯一约束冲突
        const target = (error.meta?.target as string[]) || []
        const field = target.length > 0 ? target.join(', ') : '字段'
        return {
          message: `${field} 已存在，请使用其他值`,
          statusCode: 409,
        }
      
      case 'P2025':
        // 记录不存在
        return {
          message: '要操作的记录不存在',
          statusCode: 404,
        }
      
      case 'P2003':
        // 外键约束失败
        return {
          message: '关联的数据不存在或无法删除有关联的数据',
          statusCode: 400,
        }
      
      case 'P2014':
        // 关系违反约束
        return {
          message: '操作违反了数据关系约束',
          statusCode: 400,
        }
      
      default:
        return {
          message: '数据库操作失败',
          statusCode: 500,
        }
    }
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    return {
      message: '数据验证失败，请检查输入参数',
      statusCode: 400,
    }
  }

  return {
    message: '服务器内部错误',
    statusCode: 500,
  }
}

/**
 * 获取友好的错误消息
 */
export function getFriendlyErrorMessage(error: any): string {
  if (error instanceof AppError) {
    return error.message
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError || 
      error instanceof Prisma.PrismaClientValidationError) {
    return parsePrismaError(error).message
  }

  // 开发环境显示详细错误，生产环境显示通用错误
  if (process.env.NODE_ENV === 'development') {
    return error?.message || '未知错误'
  }

  return '服务器处理请求时发生错误'
}

/**
 * 获取错误的 HTTP 状态码
 */
export function getErrorStatusCode(error: any): number {
  if (error instanceof AppError) {
    return error.statusCode
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError || 
      error instanceof Prisma.PrismaClientValidationError) {
    return parsePrismaError(error).statusCode
  }

  return 500
}

/**
 * 包装异步 API 路由处理器，统一错误处理
 */
export function withErrorHandler<T extends (...args: any[]) => Promise<Response>>(
  handler: T
): T {
  return (async (...args: any[]) => {
    try {
      return await handler(...args)
    } catch (error) {
      console.error('API Error:', error)
      const message = getFriendlyErrorMessage(error)
      const statusCode = getErrorStatusCode(error)
      
      return Response.json(
        {
          success: false,
          message,
          error: process.env.NODE_ENV === 'development' ? error : undefined,
        },
        { status: statusCode }
      )
    }
  }) as T
}
