import { prisma } from "@/lib/prisma";
import { RegimeTributario } from "@prisma/client";

async function main() {
  // Atualizar MedFlow existente para inativa
  await prisma.empresaFiscal.update({
    where: { id: 1 },
    data: { ativo: false },
  });

  // DAC Hospitalar
  await prisma.empresaFiscal.upsert({
    where: { cnpj: "64025258000125" },
    update: {},
    create: {
      razaoSocial: "Dac Hospitalar LTDA",
      nomeFantasia: "Dac Hospitalar",
      cnpj: "64025258000125",
      regimeTributario: RegimeTributario.SIMPLES_NACIONAL,
      logradouro: "Rua Van Lerbergue",
      numero: "6378",
      complemento: "Lote 3A Quadra15 Loja 31",
      bairro: "Jardim Atlantico Oeste",
      cep: "24935440",
      municipio: "Maricá",
      uf: "RJ",
      codigoMunicipio: "3302700",
      ambienteSEFAZ: "homologacao",
      serieNFe: "1",
      ativo: true,
    },
  });

  // PulseMed Hospitalar
  await prisma.empresaFiscal.upsert({
    where: { cnpj: "59655623000145" },
    update: {},
    create: {
      razaoSocial: "Pulsemed Hospitalar LTDA",
      nomeFantasia: "Pulsemed Hospitalar",
      cnpj: "59655623000145",
      regimeTributario: RegimeTributario.SIMPLES_NACIONAL,
      logradouro: "Rua Van Lerbergue",
      numero: "6378",
      complemento: "Lote 3A Quadra15 Loja 31",
      bairro: "Jardim Atlantico Oeste",
      cep: "24935440",
      municipio: "Maricá",
      uf: "RJ",
      codigoMunicipio: "3302700",
      ambienteSEFAZ: "homologacao",
      serieNFe: "1",
      ativo: true,
    },
  });

  console.log("Empresas fiscais criadas com sucesso.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
