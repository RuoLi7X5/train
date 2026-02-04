import { PrismaClient } from '@prisma/client'
import { Pool, neonConfig } from '@neondatabase/serverless'
import { PrismaNeon } from '@prisma/adapter-neon'

const connectionString = process.env.DATABASE_URL;

const prismaClientSingleton = () => {
  if (!connectionString) {
    throw new Error('DATABASE_URL is not defined');
  }

  // 在 Edge Runtime (Cloudflare Pages) 中使用 Neon Serverless Driver
  // 也就是当全局 WebSocket 存在时 (Cloudflare Workers/Pages 都有)
  // 或者是显式的 Edge 环境
  const isEdge = process.env.NEXT_RUNTIME === 'edge' || (typeof WebSocket !== 'undefined' && process.env.NODE_ENV === 'production');

  if (isEdge) {
    // 显式配置 WebSocket，解决 Edge Runtime 下 Connection closed 问题
    neonConfig.webSocketConstructor = WebSocket
    
    // 在 Edge 环境下，限制连接池大小为 1，利用 Neon 的多路复用能力
    // 避免在 Edge Worker 中建立过多 WebSocket 连接导致 Connection closed
    const pool = new Pool({ 
      connectionString, 
      max: 1,
      // 设置连接超时，避免无限等待
      connectionTimeoutMillis: 5000,
      // 设置空闲超时，允许回收空闲连接 (可选，视情况而定，这里暂时保持默认)
    })

    // [关键修复] 监听连接池错误，防止 uncaughtException 导致进程崩溃
    pool.on('error', (err) => {
      console.error('Neon Pool Error (Recoverable):', err)
      // 连接池通常会自动重连，记录错误即可
    })

    const adapter = new PrismaNeon(pool as any)
    return new PrismaClient({ adapter })
  } else {
    // 本地开发 (Node.js) 环境，直接使用 TCP 直连
    // 这样避免了本地缺少 WebSocket polyfill 的问题
    return new PrismaClient()
  }
}

declare global {
  var prisma: undefined | ReturnType<typeof prismaClientSingleton>
}

const prisma = globalThis.prisma ?? prismaClientSingleton()

export default prisma

if (process.env.NODE_ENV !== 'production') globalThis.prisma = prisma
