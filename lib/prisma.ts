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
    const pool = new Pool({ connectionString })
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
