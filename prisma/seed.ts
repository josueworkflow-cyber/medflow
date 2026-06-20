import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const empresaMedFlow = await prisma.empresaFiscal.upsert({
    where: { cnpj: '00000000000191' },
    update: { ativo: false },
    create: {
      razaoSocial: 'MedFlow Distribuidora Hospitalar Ltda',
      nomeFantasia: 'MedFlow',
      cnpj: '00000000000191',
      inscricaoEstadual: '1234567890',
      regimeTributario: 'LUCRO_REAL',
      ativo: false,
    },
  })

  const empresaDac = await prisma.empresaFiscal.upsert({
    where: { cnpj: '64025258000125' },
    update: { ativo: true },
    create: {
      razaoSocial: 'Dac Hospitalar LTDA',
      nomeFantasia: 'Dac Hospitalar',
      cnpj: '64025258000125',
      regimeTributario: 'SIMPLES_NACIONAL',
      logradouro: 'Rua Van Lerbergue',
      numero: '6378',
      complemento: 'Lote 3A Quadra15 Loja 31',
      bairro: 'Jardim Atlantico Oeste',
      cep: '24935440',
      municipio: 'Maricá',
      uf: 'RJ',
      codigoMunicipio: '3302700',
      ambienteSEFAZ: 'homologacao',
      serieNFe: '1',
      ativo: true,
    },
  })

  const empresaPulseMed = await prisma.empresaFiscal.upsert({
    where: { cnpj: '59655623000145' },
    update: { ativo: true },
    create: {
      razaoSocial: 'Pulsemed Hospitalar LTDA',
      nomeFantasia: 'Pulsemed Hospitalar',
      cnpj: '59655623000145',
      regimeTributario: 'SIMPLES_NACIONAL',
      logradouro: 'Rua Van Lerbergue',
      numero: '6378',
      complemento: 'Lote 3A Quadra15 Loja 31',
      bairro: 'Jardim Atlantico Oeste',
      cep: '24935440',
      municipio: 'Maricá',
      uf: 'RJ',
      codigoMunicipio: '3302700',
      ambienteSEFAZ: 'homologacao',
      serieNFe: '1',
      ativo: true,
    },
  })

  for (const empresa of [empresaDac, empresaPulseMed]) {
    await prisma.naturezaOperacaoFiscal.upsert({
      where: {
        empresaFiscalId_codigo: {
          empresaFiscalId: empresa.id,
          codigo: 'VENDA_MERCADORIA',
        },
      },
      update: { ativa: true, padrao: true },
      create: {
        empresaFiscalId: empresa.id,
        codigo: 'VENDA_MERCADORIA',
        nome: 'Venda de mercadoria',
        tipoOperacao: 'SAIDA',
        finalidadeNFe: 1,
        padrao: true,
      },
    })
  }

  console.log({ empresaMedFlow, empresaDac, empresaPulseMed })

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
