const { prisma } = require('./lib/db/prisma');
const users = require('./data/users.json');

async function seed() {
  for (const user of users.users) {
    await prisma.user.create({
      data: {
        id: user.id,
        email: user.email,
        password: user.password,
        name: user.name,
        role: user.role,
        isActive: user.isActive,
        createdAt: new Date(user.createdAt),
        updatedAt: new Date(user.updatedAt),
      },
    });
  }
  console.log('Données importées avec succès');
}

seed().catch((e) => console.error(e));