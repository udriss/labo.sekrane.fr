const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  const email = "admin@labo.fr";
  const password = "admin1234";
  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    const user = await prisma.users.upsert({
      where: { email },
      update: { password: hashedPassword, role: "ADMIN" },
      create: {
        email,
        name: "Admin",
        password: hashedPassword,
        role: "ADMIN"
      }
    });
    console.log("Admin user created or updated:", user);
    console.log("Email:", email);
    console.log("Password:", password);
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
