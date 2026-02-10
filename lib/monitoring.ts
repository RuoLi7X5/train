/**
 * 性能监控系统
 * 用于监控 API 响应时间、数据库查询性能等
 */

import { logger } from './logger'

interface PerformanceMetric {
  name: string
  startTime: number
  endTime?: number
  duration?: number
  metadata?: Record<string, any>
}

class PerformanceMonitor {
  private static instance: PerformanceMonitor
  private metrics: Map<string, PerformanceMetric> = new Map()
  private completedMetrics: PerformanceMetric[] = []

  private constructor() {}

  public static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor()
    }
    return PerformanceMonitor.instance
  }

  /**
   * 开始性能监控
   */
  public start(name: string, metadata?: Record<string, any>): string {
    const id = `${name}-${Date.now()}-${Math.random()}`
    this.metrics.set(id, {
      name,
      startTime: Date.now(),
      metadata,
    })
    return id
  }

  /**
   * 结束性能监控
   */
  public end(id: string): number | null {
    const metric = this.metrics.get(id)
    if (!metric) {
      logger.warn(`Performance metric not found: ${id}`)
      return null
    }

    const endTime = Date.now()
    const duration = endTime - metric.startTime

    const completedMetric: PerformanceMetric = {
      ...metric,
      endTime,
      duration,
    }

    this.completedMetrics.push(completedMetric)
    this.metrics.delete(id)

    // 记录慢查询/慢请求
    if (duration > 1000) {
      logger.warn(`Slow operation detected: ${metric.name}`, {
        duration: `${duration}ms`,
        ...metric.metadata,
      })
    }

    return duration
  }

  /**
   * 获取性能统计
   */
  public getStats(name?: string): {
    count: number
    avgDuration: number
    minDuration: number
    maxDuration: number
  } | null {
    const filtered = name
      ? this.completedMetrics.filter((m) => m.name === name)
      : this.completedMetrics

    if (filtered.length === 0) return null

    const durations = filtered.map((m) => m.duration || 0)
    return {
      count: filtered.length,
      avgDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
      minDuration: Math.min(...durations),
      maxDuration: Math.max(...durations),
    }
  }

  /**
   * 清空统计数据
   */
  public clear() {
    this.metrics.clear()
    this.completedMetrics = []
  }
}

export const monitor = PerformanceMonitor.getInstance()

/**
 * API 路由性能监控装饰器
 */
export function withPerformanceMonitoring<T extends (...args: any[]) => Promise<Response>>(
  handler: T,
  name: string
): T {
  return (async (...args: any[]) => {
    const monitorId = monitor.start(`API:${name}`)
    const startTime = Date.now()

    try {
      const response = await handler(...args)
      const duration = monitor.end(monitorId) || 0

      // 记录 API 响应时间
      logger.apiResponse(
        args[0]?.method || 'UNKNOWN',
        name,
        response.status,
        duration
      )

      return response
    } catch (error) {
      monitor.end(monitorId)
      throw error
    }
  }) as T
}

/**
 * 数据库查询性能监控
 */
export async function withDbMonitoring<T>(
  queryName: string,
  queryFn: () => Promise<T>
): Promise<T> {
  const monitorId = monitor.start(`DB:${queryName}`)

  try {
    const result = await queryFn()
    const duration = monitor.end(monitorId) || 0

    logger.dbQuery(queryName, duration)

    return result
  } catch (error) {
    monitor.end(monitorId)
    throw error
  }
}
