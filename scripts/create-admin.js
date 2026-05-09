/* eslint-disable @typescript-eslint/no-require-imports */
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const email = "admin@medflow.com";
  const password = "admin123";
  const hashedPassword = await bcrypt.hash(password, 12);

  const user = await prisma.usuario.upsert({
    where: { email },
    update: {
      senha: hashedPassword,
      perfil: "ADMINISTRADOR",
      ativo: true
    },
    create: {
      nome: "Administrador Central",
      email,
      senha: hashedPassword,
      perfil: "ADMINISTRADOR"
    }
  });

  console.log(`\n✅ Usuário admin configurado com sucesso!`);
  console.log(`📧 Email: ${email}`);
  console.log(`🔑 Senha: ${password}`);
  console.log(`🛡️ Perfil: ADMINISTRADOR\n`);
}

main()
  .catch((e) => {
    console.error("❌ Erro ao criar admin:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
