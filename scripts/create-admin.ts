import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  const email = "admin@labo.fr"
  const password = "admin123456"
  const hashedPassword = await bcrypt.hash(password, 10)

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
  console.log("Admin user created or updated:", user)
}

main().finally(() => prisma.$disconnect())
