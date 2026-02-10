# 🚀 开发者快速参考指南

## 📋 常用工具速查

### Toast 通知

```typescript
import { useToast } from '@/components/Toast'

const MyComponent = () => {
  const toast = useToast()
  
  // 成功提示
  toast.showSuccess('操作成功')
  
  // 错误提示
  toast.showError('操作失败')
  
  // 警告提示
  toast.showWarning('请注意')
  
  // 信息提示
  toast.showInfo('提示信息')
  
  // 确认对话框
  toast.confirm('确定要删除吗？', () => {
    // 用户点击确认后的操作
  })
}
```

---

### API 响应（后端）

```typescript
import { 
  successResponse, 
  errorResponse,
  unauthorizedResponse,
  forbiddenResponse,
  notFoundResponse,
  validationErrorResponse
} from '@/lib/api-response'

export async function GET() {
  try {
    const data = await fetchData()
    return successResponse(data, '获取成功')
  } catch (error) {
    return errorResponse('获取失败', 500, error)
  }
}
```

---

### 日志系统

```typescript
import { logger } from '@/lib/logger'

// 信息日志
logger.info('用户登录成功', { userId: 123 })

// 错误日志
logger.error('数据库连接失败', error, { context: 'extra-info' })

// 警告日志
logger.warn('慢查询检测', { query: 'SELECT *', duration: 1500 })

// 调试日志（仅开发环境）
logger.debug('调试信息', { data: someData })

// API 日志
logger.apiRequest('POST', '/api/users')
logger.apiResponse('POST', '/api/users', 201, 150)

// 数据库日志
logger.dbQuery('findMany users', 250)
```

---

### 性能监控

```typescript
import { monitor, withPerformanceMonitoring, withDbMonitoring } from '@/lib/monitoring'

// API 路由自动监控
async function handler(request: Request) {
  // ... your code
}
export const POST = withPerformanceMonitoring(handler, '/api/users')

// 数据库查询监控
const users = await withDbMonitoring('findMany users', () => 
  prisma.user.findMany()
)

// 手动监控
const id = monitor.start('复杂操作')
// ... do something
monitor.end(id)

// 获取统计
const stats = monitor.getStats('findMany users')
console.log(stats) // { count, avgDuration, minDuration, maxDuration }
```

---

### 客户端 API 调用

```typescript
import { apiCall } from '@/lib/client-utils'

// TypeScript 类型安全
const { success, data, message } = await apiCall<User[]>('/api/users')

if (success) {
  console.log(data) // User[]
} else {
  toast.showError(message)
}

// 带参数的调用
const result = await apiCall('/api/users', {
  method: 'POST',
  body: JSON.stringify({ username: 'test' }),
  headers: { 'Content-Type': 'application/json' }
})
```

---

### 加载指示器

```typescript
import { LoadingSpinner, PageLoading, InlineLoading } from '@/components/LoadingSpinner'

// 全屏加载
<LoadingSpinner size="lg" text="加载中..." fullScreen />

// 页面级加载
<PageLoading text="加载数据中..." />

// 行内加载
<InlineLoading text="处理中..." />
```

---

### SWR 数据获取

```typescript
import useSWR from 'swr'
import { fetcher, swrConfig, realtimeConfig, staticConfig } from '@/lib/swr-config'

// 基本用法
const { data, error, isLoading, mutate } = useSWR('/api/users', fetcher, swrConfig)

// 实时数据（10秒自动刷新）
const { data } = useSWR('/api/submissions', fetcher, realtimeConfig)

// 静态数据（长时间缓存）
const { data } = useSWR('/api/classes', fetcher, staticConfig)
```

---

### Prisma 类型安全

```typescript
import prisma, { problemPushModel } from '@/lib/prisma'
import { Prisma, Role, UserStatus } from '@prisma/client'

// 使用枚举
const role: Role = 'STUDENT'
const status: UserStatus = 'ACTIVE'

// ProblemPush 模型访问
const push = await problemPushModel.findFirst({
  where: { studentId: 1, problemId: 1 }
})

// 类型安全的 where 子句
const where: Prisma.UserWhereInput = {
  role: 'STUDENT',
  status: 'ACTIVE'
}
```

---

### 错误处理

```typescript
import { 
  AppError, 
  ValidationError, 
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  BusinessError,
  parsePrismaError,
  withErrorHandler
} from '@/lib/error-handler'

// 抛出业务错误
throw new ValidationError('用户名不能为空')
throw new UnauthorizedError()
throw new NotFoundError('用户不存在')

// API 路由错误处理
export const GET = withErrorHandler(async (request) => {
  // ... your code
  // 自动捕获错误并返回统一格式
})

// Prisma 错误解析
try {
  await prisma.user.create({ data: { ... } })
} catch (error) {
  const { message, statusCode } = parsePrismaError(error)
  return errorResponse(message, statusCode)
}
```

---

## 🎨 代码规范

### API 路由模板

```typescript
import { successResponse, errorResponse } from '@/lib/api-response'
import { logger } from '@/lib/logger'
import { withPerformanceMonitoring } from '@/lib/monitoring'
import prisma from '@/lib/prisma'

async function handler(request: Request) {
  try {
    logger.apiRequest('GET', '/api/resource')
    
    // 业务逻辑
    const data = await prisma.resource.findMany()
    
    return successResponse(data)
  } catch (error) {
    logger.error('Failed to fetch resource', error as Error)
    return errorResponse('获取失败', 500, error)
  }
}

export const GET = withPerformanceMonitoring(handler, '/api/resource')
```

---

### 客户端组件模板

```typescript
'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { useToast } from '@/components/Toast'
import { fetcher, swrConfig } from '@/lib/swr-config'
import { LoadingSpinner } from '@/components/LoadingSpinner'

export default function MyComponent() {
  const toast = useToast()
  const { data, error, isLoading, mutate } = useSWR('/api/resource', fetcher, swrConfig)
  
  if (isLoading) return <LoadingSpinner />
  if (error) return <div>加载失败</div>
  
  const handleAction = async () => {
    try {
      const res = await fetch('/api/resource', { method: 'POST' })
      if (res.ok) {
        toast.showSuccess('操作成功')
        mutate() // 刷新数据
      } else {
        toast.showError('操作失败')
      }
    } catch (error) {
      toast.showError('操作失败')
    }
  }
  
  return <div>...</div>
}
```

---

## 🔍 调试技巧

### 查看性能统计
```typescript
import { monitor } from '@/lib/monitoring'

// 在浏览器控制台
console.log(monitor.getStats())
console.log(monitor.getStats('API:/api/users'))
```

### 查看日志
日志会自动输出到浏览器控制台（开发环境）或服务器日志（生产环境）

---

## 📖 相关文档

- `API_UNIFICATION_GUIDE.md` - API 统一改造指南
- `OPTIMIZATION_SUMMARY.md` - 优化完成总结
- `ROADMAP.md` - 项目路线图

---

**更新时间：** 2026-02-10
