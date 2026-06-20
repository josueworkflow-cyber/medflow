import type {
  TaxCalculationResult,
  TaxItemCalculation,
  TaxItemContext,
  TaxOperationContext,
  TaxRuleInput,
} from "@/lib/types/fiscal-tax";

const CST_ICMS_SUPORTADOS = new Set(["00", "10", "20", "40", "41", "50"]);
const CSOSN_SUPORTADOS = new Set(["102", "103", "300", "400"]);
const CST_IPI_TRIBUTADOS = new Set(["50", "99"]);
const CST_IPI_NAO_TRIBUTADOS = new Set(["51", "52", "53", "54", "55"]);
const CST_CONTRIBUICAO_ALIQUOTA = new Set(["01", "02"]);
const CST_CONTRIBUICAO_NT = new Set(["04", "05", "06", "07", "08", "09"]);
const CST_CONTRIBUICAO_OUTROS = new Set(["49", "99"]);

function money(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function percent(value: number): number {
  if (!Number.isFinite(value) || value < 0 || value > 100) {
    throw new Error(`Percentual tributario invalido: ${value}`);
  }
  return value / 100;
}

function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

function specificity(rule: TaxRuleInput): number {
  let score = 0;
  if (rule.produtoId !== null) score += 1000;
  if (rule.ncmPrefixo) score += 100 + onlyDigits(rule.ncmPrefixo).length;
  if (rule.ufDestino) score += 40;
  if (rule.contribuinteICMS !== null) score += 20;
  if (rule.consumidorFinal !== null) score += 10;
  return score;
}

function matches(rule: TaxRuleInput, item: TaxItemContext, context: TaxOperationContext): boolean {
  if (rule.produtoId !== null && rule.produtoId !== item.produtoId) return false;
  if (rule.ncmPrefixo && !onlyDigits(item.ncm).startsWith(onlyDigits(rule.ncmPrefixo))) return false;
  if (rule.ufDestino && rule.ufDestino.toUpperCase() !== context.ufDestino.toUpperCase()) return false;
  if (rule.contribuinteICMS !== null && rule.contribuinteICMS !== context.contribuinteICMS) return false;
  if (rule.consumidorFinal !== null && rule.consumidorFinal !== context.consumidorFinal) return false;
  return true;
}

export function resolveTaxRule(
  rules: TaxRuleInput[],
  item: TaxItemContext,
  context: TaxOperationContext
): TaxRuleInput {
  const candidates = rules
    .filter((rule) => matches(rule, item, context))
    .map((rule) => ({ rule, score: specificity(rule) }))
    .sort((a, b) => b.rule.prioridade - a.rule.prioridade || b.score - a.score || a.rule.id - b.rule.id);

  if (candidates.length === 0) {
    throw new Error(`Nenhuma regra tributaria encontrada para ${item.descricao} (NCM ${item.ncm}).`);
  }

  if (
    candidates.length > 1 &&
    candidates[0].rule.prioridade === candidates[1].rule.prioridade &&
    candidates[0].score === candidates[1].score
  ) {
    throw new Error(
      `Regras tributarias ambiguas para ${item.descricao}: ${candidates[0].rule.nome} e ${candidates[1].rule.nome}.`
    );
  }

  return candidates[0].rule;
}

export function validateTaxRule(rule: TaxRuleInput, context: TaxOperationContext): void {
  const cfop = onlyDigits(rule.cfop);
  if (cfop.length !== 4) throw new Error(`CFOP invalido na regra ${rule.nome}.`);

  const interstate = context.ufOrigem.toUpperCase() !== context.ufDestino.toUpperCase();
  const expectedPrefix = interstate ? "6" : "5";
  if (!cfop.startsWith(expectedPrefix)) {
    throw new Error(`CFOP ${cfop} incompativel com operacao ${interstate ? "interestadual" : "interna"}.`);
  }

  if (context.regimeTributario === "SIMPLES_NACIONAL") {
    if (!rule.csosn || !CSOSN_SUPORTADOS.has(rule.csosn)) {
      throw new Error(`CSOSN da regra ${rule.nome} deve ser 102, 103, 300 ou 400.`);
    }
  } else if (!rule.cstIcms || !CST_ICMS_SUPORTADOS.has(rule.cstIcms)) {
    throw new Error(`CST ICMS da regra ${rule.nome} nao e suportado.`);
  }

  if (!CST_IPI_TRIBUTADOS.has(rule.cstIpi) && !CST_IPI_NAO_TRIBUTADOS.has(rule.cstIpi)) {
    throw new Error(`CST IPI da regra ${rule.nome} nao e suportado.`);
  }
  for (const [label, cst] of [["PIS", rule.cstPis], ["COFINS", rule.cstCofins]] as const) {
    if (!CST_CONTRIBUICAO_ALIQUOTA.has(cst) && !CST_CONTRIBUICAO_NT.has(cst) && !CST_CONTRIBUICAO_OUTROS.has(cst)) {
      throw new Error(`CST ${label} da regra ${rule.nome} nao e suportado.`);
    }
  }
}

export function calculateTaxItem(
  item: TaxItemContext,
  rule: TaxRuleInput,
  context: TaxOperationContext
): TaxItemCalculation {
  validateTaxRule(rule, context);
  const valorBruto = money(item.quantidade * item.valorUnitario);
  const desconto = Math.min(valorBruto, Math.max(0, money(item.desconto)));
  const valorLiquido = money(valorBruto - desconto);
  const tributaIcmsProprio = context.regimeTributario !== "SIMPLES_NACIONAL" && ["00", "10", "20"].includes(rule.cstIcms || "");
  const baseIcms = tributaIcmsProprio ? money(valorLiquido * (1 - percent(rule.reducaoBaseIcms))) : 0;
  const valorIcms = money(baseIcms * percent(rule.aliquotaIcms));
  const valorFcp = money(baseIcms * percent(rule.aliquotaFcp));
  const baseIcmsSt = rule.aliquotaIcmsSt > 0 ? money(valorLiquido * (1 + percent(rule.mvaSt))) : 0;
  const valorIcmsSt = rule.aliquotaIcmsSt > 0
    ? Math.max(0, money(baseIcmsSt * percent(rule.aliquotaIcmsSt) - valorIcms))
    : 0;
  const valorFcpSt = money(baseIcmsSt * percent(rule.aliquotaFcpSt));
  const valorDifalDestino = context.consumidorFinal && rule.aliquotaInterestadual !== null && rule.aliquotaInternaDestino !== null
    ? Math.max(0, money(baseIcms * percent(Math.max(0, rule.aliquotaInternaDestino - rule.aliquotaInterestadual))))
    : 0;
  const baseIpi = CST_IPI_TRIBUTADOS.has(rule.cstIpi) ? valorLiquido : 0;
  const valorIpi = money(baseIpi * percent(rule.aliquotaIpi));
  const basePis = CST_CONTRIBUICAO_ALIQUOTA.has(rule.cstPis) || CST_CONTRIBUICAO_OUTROS.has(rule.cstPis) ? valorLiquido : 0;
  const valorPis = money(basePis * percent(rule.aliquotaPis));
  const baseCofins = CST_CONTRIBUICAO_ALIQUOTA.has(rule.cstCofins) || CST_CONTRIBUICAO_OUTROS.has(rule.cstCofins) ? valorLiquido : 0;
  const valorCofins = money(baseCofins * percent(rule.aliquotaCofins));

  return {
    itemPedidoId: item.itemPedidoId,
    produtoId: item.produtoId,
    descricao: item.descricao,
    ncm: onlyDigits(item.ncm),
    quantidade: item.quantidade,
    valorBruto,
    desconto,
    valorLiquido,
    regraId: rule.id,
    regraNome: rule.nome,
    cfop: onlyDigits(rule.cfop),
    origemMercadoria: rule.origemMercadoria || "0",
    cstIcms: rule.cstIcms,
    csosn: rule.csosn,
    modalidadeBcIcms: rule.modalidadeBcIcms,
    baseIcms,
    aliquotaIcms: rule.aliquotaIcms,
    valorIcms,
    reducaoBaseIcms: rule.reducaoBaseIcms,
    aliquotaFcp: rule.aliquotaFcp,
    valorFcp,
    modalidadeBcSt: rule.modalidadeBcSt,
    mvaSt: rule.mvaSt,
    baseIcmsSt,
    aliquotaIcmsSt: rule.aliquotaIcmsSt,
    valorIcmsSt,
    aliquotaFcpSt: rule.aliquotaFcpSt,
    valorFcpSt,
    aliquotaInterestadual: rule.aliquotaInterestadual,
    aliquotaInternaDestino: rule.aliquotaInternaDestino,
    valorDifalDestino,
    cstIpi: rule.cstIpi,
    codigoEnquadramentoIpi: rule.codigoEnquadramentoIpi,
    baseIpi,
    aliquotaIpi: rule.aliquotaIpi,
    valorIpi,
    cstPis: rule.cstPis,
    basePis,
    aliquotaPis: rule.aliquotaPis,
    valorPis,
    cstCofins: rule.cstCofins,
    baseCofins,
    aliquotaCofins: rule.aliquotaCofins,
    valorCofins,
    informacoesComplementares: rule.informacoesComplementares,
  };
}

export function calculateTaxes(params: {
  natureza: TaxCalculationResult["natureza"];
  context: TaxOperationContext;
  items: TaxItemContext[];
  rules: TaxRuleInput[];
}): TaxCalculationResult {
  const itens = params.items.map((item) => {
    const rule = resolveTaxRule(params.rules, item, params.context);
    return calculateTaxItem(item, rule, params.context);
  });
  const sum = (field: keyof TaxItemCalculation) => money(itens.reduce((total, item) => total + Number(item[field] || 0), 0));
  const valorProdutos = sum("valorBruto");
  const desconto = sum("desconto");
  const valorIpi = sum("valorIpi");
  const valorIcmsSt = sum("valorIcmsSt");
  const valorFcpSt = sum("valorFcpSt");

  return {
    natureza: params.natureza,
    contexto: params.context,
    itens,
    totais: {
      valorProdutos,
      desconto,
      baseIcms: sum("baseIcms"),
      valorIcms: sum("valorIcms"),
      valorFcp: sum("valorFcp"),
      baseIcmsSt: sum("baseIcmsSt"),
      valorIcmsSt,
      valorFcpSt,
      valorDifalDestino: sum("valorDifalDestino"),
      valorIpi,
      valorPis: sum("valorPis"),
      valorCofins: sum("valorCofins"),
      valorNota: money(valorProdutos - desconto + valorIpi + valorIcmsSt + valorFcpSt),
    },
    informacoesComplementares: Array.from(new Set(itens.map((item) => item.informacoesComplementares).filter(Boolean))) as string[],
  };
}
