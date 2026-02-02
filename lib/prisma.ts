import { PrismaClient } from '@prisma/client'
import { Pool, neonConfig } from '@neondatabase/serverless'
import { PrismaNeon } from '@prisma/adapter-neon'
import ws from 'ws'

// Cloudflare Workers/Pages 需要配置 WebSocket
neonConfig.webSocketConstructor = ws

const connectionString = process.env.DATABASE_URL || "postgresql://postgres:06L2j3FqsoyRdRUC@db.qavvzqpzjhsogctkntue.supabase.co:5432/postgres"

const prismaClientSingleton = () => {
  const pool = new Pool({ connectionString })
  const adapter = new PrismaNeon(pool)
  return new PrismaClient({ adapter })
}

declare global {
  var prisma: undefined | ReturnType<typeof prismaClientSingleton>
}

const prisma = globalThis.prisma ?? prismaClientSingleton()

export default prisma

if (process.env.NODE_ENV !== 'production') globalThis.prisma = prisma
