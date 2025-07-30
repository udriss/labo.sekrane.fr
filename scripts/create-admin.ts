import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  const email = "admin@labo.fr"
  const password = "admin123"
  const hashedPassword = await bcrypt.hash(password, 12)

  const user = await prisma.user.upsert({
    where: { email },
    update: { password: hashedPassword, role: "ADMIN" },
    create: {
      email,
      name: "Admin",
      password: hashedPassword,
      role: "ADMIN"
    }
  })
  
}

main().finally(() => prisma.$disconnect())
