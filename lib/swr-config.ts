/**
 * SWR 全局配置和优化策略
 */

import { SWRConfiguration } from 'swr'

/**
 * 通用的 fetcher 函数
 */
export const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) {
    const error: any = new Error('请求失败')
    error.info = await res.json()
    error.status = res.status
    throw error
  }
  return res.json()
}

/**
 * SWR 默认配置
 * 优化数据获取和缓存策略
 */
export const swrConfig: SWRConfiguration = {
  fetcher,
  // 5秒内避免重复请求
  dedupingInterval: 5000,
  // 窗口获得焦点时不自动重新验证（避免频繁请求）
  revalidateOnFocus: false,
  // 重新连接时自动重新验证
  revalidateOnReconnect: true,
  // 5分钟后数据视为过期，需要重新验证
  refreshInterval: 0,
  // 错误重试
  errorRetryCount: 3,
  errorRetryInterval: 5000,
  // 保持之前的数据直到新数据到达
  keepPreviousData: true,
}

/**
 * 针对实时数据的配置（如提交记录）
 */
export const realtimeConfig: SWRConfiguration = {
  ...swrConfig,
  refreshInterval: 10000, // 10秒自动刷新
  revalidateOnFocus: true,
}

/**
 * 针对静态数据的配置（如用户列表）
 */
export const staticConfig: SWRConfiguration = {
  ...swrConfig,
  dedupingInterval: 30000, // 30秒内避免重复请求
  revalidateOnFocus: false,
  refreshInterval: 0,
}
