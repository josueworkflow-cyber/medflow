import { prisma } from "@/lib/prisma";
import type { TaxCalculationResult, TaxRuleInput } from "@/lib/types/fiscal-tax";
import { calculateTaxes } from "./tax-engine";

type ClienteTributarioOverride = {
  estado?: string | null;
  contribuinteICMS?: boolean;
  consumidorFinal?: boolean;
};

function toNumber(value: unknown): number {
  return Number(value || 0);
}

function normalizeUf(value: string | null | undefined, label: string): string {
  const uf = (value || "").trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(uf)) throw new Error(`${label} deve conter uma UF valida.`);
  return uf;
}

export function mapTaxRule(rule: any): TaxRuleInput {
  return {
    id: rule.id,
    nome: rule.nome,
    prioridade: rule.prioridade,
    produtoId: rule.produtoId,
    ncmPrefixo: rule.ncmPrefixo,
    ufDestino: rule.ufDestino,
    contribuinteICMS: rule.contribuinteICMS,
    consumidorFinal: rule.consumidorFinal,
    cfop: rule.cfop,
    origemMercadoria: rule.origemMercadoria,
    cstIcms: rule.cstIcms,
    csosn: rule.csosn,
    modalidadeBcIcms: rule.modalidadeBcIcms,
    aliquotaIcms: toNumber(rule.aliquotaIcms),
    reducaoBaseIcms: toNumber(rule.reducaoBaseIcms),
    aliquotaFcp: toNumber(rule.aliquotaFcp),
    modalidadeBcSt: rule.modalidadeBcSt,
    mvaSt: toNumber(rule.mvaSt),
    aliquotaIcmsSt: toNumber(rule.aliquotaIcmsSt),
    aliquotaFcpSt: toNumber(rule.aliquotaFcpSt),
    aliquotaInterestadual: rule.aliquotaInterestadual === null ? null : Number(rule.aliquotaInterestadual),
    aliquotaInternaDestino: rule.aliquotaInternaDestino === null ? null : Number(rule.aliquotaInternaDestino),
    cstIpi: rule.cstIpi,
    aliquotaIpi: toNumber(rule.aliquotaIpi),
    codigoEnquadramentoIpi: rule.codigoEnquadramentoIpi,
    cstPis: rule.cstPis,
    aliquotaPis: toNumber(rule.aliquotaPis),
    cstCofins: rule.cstCofins,
    aliquotaCofins: toNumber(rule.aliquotaCofins),
    informacoesComplementares: rule.informacoesComplementares,
  };
}

export async function calculateOrderTaxes(params: {
  pedidoVendaId: number;
  empresaFiscalId: number;
  naturezaOperacaoId: number;
  cliente?: ClienteTributarioOverride;
}): Promise<TaxCalculationResult> {
  const now = new Date();
  const [pedido, empresa, natureza] = await Promise.all([
    prisma.pedidoVenda.findUnique({
      where: { id: params.pedidoVendaId },
      include: { cliente: true, itens: { include: { produto: true } } },
    }),
    prisma.empresaFiscal.findUnique({ where: { id: params.empresaFiscalId } }),
    prisma.naturezaOperacaoFiscal.findFirst({
      where: {
        id: params.naturezaOperacaoId,
        empresaFiscalId: params.empresaFiscalId,
        ativa: true,
      },
      include: {
        regras: {
          where: {
            ativa: true,
            AND: [
              { OR: [{ vigenciaInicio: null }, { vigenciaInicio: { lte: now } }] },
              { OR: [{ vigenciaFim: null }, { vigenciaFim: { gte: now } }] },
            ],
          },
        },
      },
    }),
  ]);

  if (!pedido) throw new Error("Pedido nao encontrado para calculo tributario.");
  if (!empresa) throw new Error("Empresa fiscal nao encontrada para calculo tributario.");
  if (!natureza) throw new Error("Natureza da operacao nao encontrada ou inativa.");
  if (natureza.tipoOperacao !== "SAIDA") {
    throw new Error("O faturamento de pedidos aceita apenas naturezas de saida.");
  }
  if (!empresa.regimeTributario) throw new Error("Empresa fiscal sem regime tributario configurado.");
  if (natureza.regras.length === 0) throw new Error(`A natureza ${natureza.nome} nao possui regras tributarias ativas.`);

  const ufOrigem = normalizeUf(empresa.uf, "UF do emitente");
  const ufDestino = normalizeUf(params.cliente?.estado ?? pedido.cliente.estado, "UF do destinatario");
  const totalBruto = pedido.itens.reduce((sum, item) => sum + item.quantidade * item.precoUnitario, 0);
  const descontoPedido = Math.max(0, pedido.desconto || 0);

  const items = pedido.itens.map((item) => {
    const ncm = (item.produto.ncm || "").replace(/\D/g, "");
    if (ncm.length !== 8) throw new Error(`Produto ${item.produto.descricao} sem NCM valido.`);
    const rateio = totalBruto > 0 ? descontoPedido * ((item.quantidade * item.precoUnitario) / totalBruto) : 0;
    return {
      itemPedidoId: item.id,
      produtoId: item.produtoId,
      descricao: item.produto.descricao,
      ncm,
      quantidade: item.quantidade,
      valorUnitario: item.precoUnitario,
      desconto: (item.desconto || 0) + rateio,
    };
  });

  return calculateTaxes({
    natureza: {
      id: natureza.id,
      codigo: natureza.codigo,
      nome: natureza.nome,
      tipoOperacao: natureza.tipoOperacao,
      finalidadeNFe: natureza.finalidadeNFe,
    },
    context: {
      regimeTributario: empresa.regimeTributario,
      ufOrigem,
      ufDestino,
      contribuinteICMS: params.cliente?.contribuinteICMS ?? pedido.cliente.contribuinteICMS,
      consumidorFinal: params.cliente?.consumidorFinal ?? pedido.cliente.consumidorFinal,
    },
    items,
    rules: natureza.regras.map(mapTaxRule),
  });
}
