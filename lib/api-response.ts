import { NextResponse } from 'next/server'

/**
 * 统一的 API 响应格式
 */
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  message?: string
  error?: string
}

/**
 * 成功响应
 */
export function successResponse<T>(data?: T, message?: string, status: number = 200) {
  return NextResponse.json(
    {
      success: true,
      data,
      message,
    } as ApiResponse<T>,
    { status }
  )
}

/**
 * 错误响应
 */
export function errorResponse(message: string, status: number = 400, error?: any) {
  console.error('API Error:', message, error)
  return NextResponse.json(
    {
      success: false,
      message,
      error: error?.message || error,
    } as ApiResponse,
    { status }
  )
}

/**
 * 未授权响应
 */
export function unauthorizedResponse(message: string = '未登录或登录已过期') {
  return errorResponse(message, 401)
}

/**
 * 禁止访问响应
 */
export function forbiddenResponse(message: string = '无权限访问') {
  return errorResponse(message, 403)
}

/**
 * 资源未找到响应
 */
export function notFoundResponse(message: string = '资源不存在') {
  return errorResponse(message, 404)
}

/**
 * 服务器错误响应
 */
export function serverErrorResponse(message: string = '服务器内部错误', error?: any) {
  return errorResponse(message, 500, error)
}

/**
 * 验证错误响应
 */
export function validationErrorResponse(message: string) {
  return errorResponse(message, 400)
}

/**
 * 部分成功响应（用于批量操作）
 */
export function partialSuccessResponse<T>(data: T, message: string) {
  return NextResponse.json(
    {
      success: true,
      data,
      message,
    } as ApiResponse<T>,
    { status: 206 } // Partial Content
  )
}
