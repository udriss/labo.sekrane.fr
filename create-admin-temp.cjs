const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  const email = "admin@labo.fr";
  const password = "admin1234";
  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    // Essayons d'abord avec 'user'
    console.log("Trying with prisma.user...");
    const user = await prisma.user.upsert({
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
    console.error("Error with prisma.user:", error.message);
    try {
      // Si ça ne marche pas, essayons avec 'users'
      console.log("Trying with prisma.users...");
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
    } catch (error2) {
      console.error("Error with prisma.users:", error2.message);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main();
