import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { empresaFiscalSelect } from "../../../fiscal-select";
import { NFSePayload } from "./nfse.types";

/**
 * Helper para obter apenas dígitos numéricos de uma string.
 */
function cleanDigits(str: string | null | undefined): string {
  if (!str) return "";
  return str.replace(/\D/g, "");
}

/**
 * Formata a data e hora em formato ISO 8601 com fuso horário (Offset local).
 */
function formatarDataHora(date: Date): string {
  const tzo = -date.getTimezoneOffset();
  const dif = tzo >= 0 ? "+" : "-";
  const pad = (num: number) => String(num).padStart(2, "0");
  return (
    date.getFullYear() +
    "-" +
    pad(date.getMonth() + 1) +
    "-" +
    pad(date.getDate()) +
    "T" +
    pad(date.getHours()) +
    ":" +
    pad(date.getMinutes()) +
    ":" +
    pad(date.getSeconds()) +
    dif +
    pad(Math.floor(Math.abs(tzo) / 60)) +
    ":" +
    pad(Math.abs(tzo) % 60)
  );
}

/**
 * Formata a data em formato YYYY-MM-DD.
 */
function formatarDataCompetencia(date: Date): string {
  const pad = (num: number) => String(num).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/**
 * Constrói o payload da NFS-e Nacional no formato DPS JSON.
 */
export async function buildNFSePayload(pedidoVendaId: number): Promise<NFSePayload> {
  const pedido = await prisma.pedidoVenda.findUnique({
    where: { id: pedidoVendaId },
    include: {
      cliente: true,
      empresaFiscal: { select: empresaFiscalSelect }
    }
  });

  if (!pedido) {
    throw new Error("Pedido nao encontrado");
  }

  const emitente = pedido.empresaFiscal;
  if (!emitente) {
    throw new Error("Empresa emissora nao definida para este pedido");
  }

  const cliente = pedido.cliente;
  if (!cliente) {
    throw new Error("Cliente nao definido para este pedido");
  }

  // 1. Validações Fiscais do Emitente (Empresa)
  if (!emitente.codigoMunicipio) {
    throw new Error("Empresa emissora sem código IBGE do município");
  }
  if (!emitente.inscricaoMunicipal) {
    throw new Error("Empresa emissora sem inscrição municipal (obrigatório para NFS-e)");
  }
  if (!emitente.codigoNbs) {
    throw new Error("Empresa emissora sem código NBS configurado");
  }
  
  const cleanNbs = cleanDigits(emitente.codigoNbs);
  if (cleanNbs.length !== 9) {
    throw new Error(`Empresa emissora com código NBS inválido (deve conter 9 dígitos)`);
  }

  if (emitente.aliquotaIss === null || emitente.aliquotaIss === undefined) {
    throw new Error("Empresa emissora sem alíquota ISS configurada");
  }

  // 2. Validações Fiscais do Cliente
  if (!cliente.codigoMunicipio) {
    throw new Error(`Cliente ${cliente.id} sem código IBGE do município`);
  }
  if (!cliente.logradouro || !cliente.numero || !cliente.bairro || !cliente.cep) {
    throw new Error(`Cliente ${cliente.id} sem endereço fiscal completo`);
  }

  // 3. Validação do Pedido
  if (!pedido.valorTotal || pedido.valorTotal <= 0) {
    throw new Error(`Pedido ${pedido.id} com valor inválido para emissão de NFS-e`);
  }

  // 4. Preparação de datas
  const agora = new Date();
  const data_emissao = formatarDataHora(agora);
  const data_competencia = formatarDataCompetencia(agora);

  // 5. Mapeamentos e cálculos exatos com Prisma.Decimal
  const codigo_municipio_emissora = parseInt(cleanDigits(emitente.codigoMunicipio), 10);
  const codigo_municipio_tomador = parseInt(cleanDigits(cliente.codigoMunicipio), 10);
  const codigo_municipio_prestacao = codigo_municipio_emissora;

  const cnpj_prestador = cleanDigits(emitente.cnpj);
  const inscricao_municipal_prestador = cleanDigits(emitente.inscricaoMunicipal) || undefined;

  const codigo_opcao_simples_nacional = emitente.regimeTributario === "SIMPLES_NACIONAL" ? 1 : 2;

  // Sanitização CPF/CNPJ Tomador
  const cnpjCpfClean = cleanDigits(cliente.cnpjCpf);
  const isCnpj = cnpjCpfClean.length === 14;

  const tomadorCpfCnpj: { cnpj_tomador?: string; cpf_tomador?: string } = {};
  if (isCnpj) {
    tomadorCpfCnpj.cnpj_tomador = cnpjCpfClean;
  } else {
    tomadorCpfCnpj.cpf_tomador = cnpjCpfClean;
  }

  // Cálculo de valor_iss usando Decimal
  const valorServicoDec = new Prisma.Decimal(pedido.valorTotal);
  const aliquotaIssDec = new Prisma.Decimal(emitente.aliquotaIss);
  const valorIssDec = valorServicoDec.mul(aliquotaIssDec).div(new Prisma.Decimal(100));
  const valor_iss = parseFloat(valorIssDec.toFixed(2));

  const percentual_total_tributos_federais = emitente.percentualTributosFederais || "0.00";
  const percentual_total_tributos_estaduais = emitente.percentualTributosEstaduais || "0.00";
  const percentual_total_tributos_municipais = aliquotaIssDec.toFixed(2);

  // Mapeamento final
  const payload: NFSePayload = {
    data_emissao,
    data_competencia,
    codigo_municipio_emissora,
    cnpj_prestador,
    ...(inscricao_municipal_prestador && { inscricao_municipal_prestador }),
    codigo_opcao_simples_nacional,
    regime_especial_tributacao: 0,
    
    // Tomador
    ...tomadorCpfCnpj,
    razao_social_tomador: cliente.razaoSocial,
    codigo_municipio_tomador,
    cep_tomador: cleanDigits(cliente.cep),
    logradouro_tomador: cliente.logradouro,
    numero_tomador: cliente.numero,
    ...(cliente.complemento && { complemento_tomador: cliente.complemento }),
    bairro_tomador: cliente.bairro,
    ...(cliente.telefone && { telefone_tomador: cleanDigits(cliente.telefone) }),
    ...(cliente.email && { email_tomador: cliente.email }),

    // Serviço
    codigo_municipio_prestacao,
    codigo_tributacao_nacional_iss: emitente.codigoTributacaoIss || "",
    codigo_nbs: cleanNbs,
    descricao_servico: pedido.observacao || `Prestacao de servicos de distribuicao hospitalar ref. pedido ${pedido.numero}`,
    valor_servico: pedido.valorTotal,

    // Tributos
    tributacao_iss: 1, // 1 = Tributado no município
    tipo_retencao_iss: 1, // 1 = Não retido
    valor_iss,

    // Tributos federais
    percentual_total_tributos_federais,
    percentual_total_tributos_estaduais,
    percentual_total_tributos_municipais,
    situacao_tributaria_pis_cofins: "07"
  };

  return payload;
}
