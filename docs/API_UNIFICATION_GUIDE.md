# API 响应统一化指南

## 为什么需要统一 API 响应？

### 当前问题

目前项目中的 API 响应格式**不统一**：

```typescript
// 不同的返回格式
return NextResponse.json(users)                          // 直接返回数据
return NextResponse.json({ message: 'Error' })           // 只有消息
return NextResponse.json({ success: true, user })        // success + 数据
return NextResponse.json({ problem, pushedCount })       // 多个数据字段
```

这导致前端需要针对不同 API 写不同的处理逻辑，增加了复杂性和出错概率。

### 统一后的好处

1. **前端处理一致**：所有 API 都返回 `{ success, data, message }` 格式
2. **类型安全**：TypeScript 可以准确推断响应类型
3. **错误处理标准化**：统一的错误格式
4. **易于维护**：新增 API 自动遵循规范
5. **便于调试**：统一的日志和监控

---

## 统一的响应格式

### 成功响应

```typescript
{
  success: true,
  data: T,           // 实际数据
  message?: string   // 可选的成功消息
}
```

### 错误响应

```typescript
{
  success: false,
  message: string,   // 错误消息
  error?: any        // 开发环境下的详细错误信息
}
```

---

## 使用示例

### 改造前（不统一）

```typescript
// app/api/users/route.ts
export async function GET() {
  try {
    const users = await prisma.user.findMany()
    return NextResponse.json(users)  // 直接返回数组
  } catch (error) {
    return NextResponse.json({ message: 'Error' }, { status: 500 })
  }
}
```

### 改造后（统一格式）

```typescript
// app/api/users/route.ts
import { successResponse, errorResponse } from '@/lib/api-response'
import { logger } from '@/lib/logger'
import { withPerformanceMonitoring } from '@/lib/monitoring'

async function handler(request: Request) {
  try {
    logger.apiRequest('GET', '/api/users')
    
    const users = await prisma.user.findMany()
    
    return successResponse(users)
  } catch (error) {
    logger.error('Failed to fetch users', error as Error)
    return errorResponse('获取用户列表失败', 500, error)
  }
}

export const GET = withPerformanceMonitoring(handler, '/api/users')
```

---

## 前端调用示例

### 改造前

```typescript
// 前端需要处理不同的响应格式
const res = await fetch('/api/users')
const users = await res.json()  // 直接是数组

const res2 = await fetch('/api/problems')
const data = await res2.json()
const problems = data.problems  // 嵌套在对象中
```

### 改造后

```typescript
// 统一的处理方式
import { apiCall } from '@/lib/client-utils'

const { success, data, message } = await apiCall<User[]>('/api/users')
if (success) {
  console.log(data)  // TypeScript 知道这是 User[]
} else {
  toast.showError(message)
}
```

---

## 改造步骤

### 1. 更新 API 路由

对于每个 API 路由文件：

1. 导入工具函数
2. 包装处理函数
3. 使用统一的响应格式
4. 添加日志和监控

### 2. 更新前端调用

1. 使用 `apiCall` 工具函数
2. 统一处理成功和错误情况
3. 使用 Toast 显示消息

---

## 已改造的 API 列表

- [ ] /api/auth/login
- [ ] /api/auth/logout
- [ ] /api/users
- [ ] /api/users/[id]
- [ ] /api/users/batch
- [ ] /api/problems
- [ ] /api/submissions
- [ ] /api/classes
- [ ] /api/comments

---

## 注意事项

1. **逐步迁移**：不要一次性改所有 API，逐个路由迁移
2. **向后兼容**：确保前端已更新后再改后端
3. **测试充分**：每次改造后测试相关功能
4. **保持简单**：不要过度封装，保持代码可读性

---

## 工具函数速查

```typescript
// API 响应
import {
  successResponse,      // 成功响应
  errorResponse,        // 通用错误
  unauthorizedResponse, // 401 未授权
  forbiddenResponse,    // 403 禁止访问
  notFoundResponse,     // 404 未找到
  validationErrorResponse, // 400 验证错误
} from '@/lib/api-response'

// 日志
import { logger } from '@/lib/logger'
logger.info('消息')
logger.error('错误', error)
logger.apiRequest('GET', '/api/users')
logger.apiResponse('GET', '/api/users', 200, 150)

// 监控
import { monitor, withPerformanceMonitoring } from '@/lib/monitoring'
const id = monitor.start('操作名称')
monitor.end(id)

// 客户端
import { apiCall } from '@/lib/client-utils'
const { success, data, message } = await apiCall('/api/users')
```
