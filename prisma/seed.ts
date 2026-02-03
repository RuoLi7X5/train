import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'file:./dev.db',
    },
  },
})

async function main() {
  const password = await bcrypt.hash('ruoli', 10)
  
  const user = await prisma.user.upsert({
    where: { username: 'ruoli' },
    update: {},
    create: {
      username: 'ruoli',
      password,
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
      displayName: '超级管理员',
    },
  })
  
  console.log({ user })
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
