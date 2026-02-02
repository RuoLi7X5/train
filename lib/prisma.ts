import { PrismaClient } from '@prisma/client'
import { Pool, neonConfig } from '@neondatabase/serverless'
import { PrismaNeon } from '@prisma/adapter-neon'

// Cloudflare Workers/Pages 环境下，全局就有 WebSocket，不需要额外引入 ws 库
// neonConfig.webSocketConstructor = ws // 这一行导致了构建错误

const connectionString = process.env.DATABASE_URL;

const prismaClientSingleton = () => {
  if (!connectionString) {
    throw new Error('DATABASE_URL is not defined');
  }
  const pool = new Pool({ connectionString })
  const adapter = new PrismaNeon(pool as any)
  return new PrismaClient({ adapter })
}

declare global {
  var prisma: undefined | ReturnType<typeof prismaClientSingleton>
}

const prisma = globalThis.prisma ?? prismaClientSingleton()

export default prisma

if (process.env.NODE_ENV !== 'production') globalThis.prisma = prisma
