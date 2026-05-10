import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding Empresa Fiscal...')
  
  const empresa = await prisma.empresaFiscal.upsert({
    where: { cnpj: '00000000000191' },
    update: {},
    create: {
      razaoSocial: 'MedFlow Distribuidora Hospitalar Ltda',
      nomeFantasia: 'MedFlow',
      cnpj: '00000000000191',
      inscricaoEstadual: '1234567890',
      regimeTributario: 'LUCRO_REAL',
      ativo: true,
    },
  })

  console.log({ empresa })

  console.log('Seeding Usuario Admin...')
  
  const senhaHash = await bcrypt.hash('admin123', 10)

  const admin = await prisma.usuario.upsert({
    where: { email: 'admin@medflow.com' },
    update: {},
    create: {
      nome: 'Administrador',
      email: 'admin@medflow.com',
      senha: senhaHash,
      perfil: 'ADMINISTRADOR',
      ativo: true,
    },
  })

  console.log({ admin })
  console.log('Seed finished.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
