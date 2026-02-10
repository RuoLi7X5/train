import { PrismaClient } from '@prisma/client'

const connectionString = process.env.DATABASE_URL;

const prismaClientSingleton = () => {
  if (!connectionString) {
    throw new Error('DATABASE_URL is not defined');
  }

  // 国内 Node 运行时部署，直接使用 TCP 直连
  return new PrismaClient()
}

declare global {
  var prisma: undefined | ReturnType<typeof prismaClientSingleton>
}

const prisma = globalThis.prisma ?? prismaClientSingleton()

export default prisma

if (process.env.NODE_ENV !== 'production') globalThis.prisma = prisma

/**
 * 类型安全的 ProblemPush 访问
 * 使用此对象代替 (prisma as any).problemPush
 */
export const problemPushModel = prisma.problemPush as any
