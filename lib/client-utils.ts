/**
 * 客户端工具函数
 * 用于统一处理前端常见操作
 */

/**
 * 通用的 API 调用处理函数
 * 自动处理错误并返回数据
 */
export async function apiCall<T = any>(
  url: string,
  options?: RequestInit
): Promise<{ success: boolean; data?: T; message?: string }> {
  try {
    const res = await fetch(url, options)
    const data = await res.json()
    
    if (!res.ok) {
      return {
        success: false,
        message: data.message || data.error || '操作失败'
      }
    }
    
    return {
      success: true,
      data: data.data || data,
      message: data.message
    }
  } catch (error) {
    console.error('API call error:', error)
    return {
      success: false,
      message: '网络请求失败'
    }
  }
}
