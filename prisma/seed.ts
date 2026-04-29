import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  console.log('Seeding Empresa Fiscal...')
  
  // Dados do nfe-generator.ts
  const empresa = await prisma.empresaFiscal.upsert({
    where: { cnpj: '00000000000191' },
    update: {},
    create: {
      razaoSocial: 'MedFlow Distribuidora Hospitalar Ltda',
      nomeFantasia: 'MedFlow',
      cnpj: '00000000000191',
      inscricaoEstadual: '1234567890',
      regimeTributario: 'LUCRO_REAL', // Padrão para teste
      ativo: true,
    },
  })

  console.log({ empresa })
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
