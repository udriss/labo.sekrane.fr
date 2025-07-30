// Script to retrieve all elements from the "Chemical" table using Prisma

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const chemicals = await prisma.chemical.findMany();
  
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });