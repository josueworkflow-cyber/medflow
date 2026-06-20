import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { calculateTaxes, resolveTaxRule } from "./tax-engine";
import type { TaxItemContext, TaxOperationContext, TaxRuleInput } from "@/lib/types/fiscal-tax";

const contextNormal: TaxOperationContext = {
  regimeTributario: "LUCRO_PRESUMIDO",
  ufOrigem: "RJ",
  ufDestino: "RJ",
  contribuinteICMS: true,
  consumidorFinal: false,
};

const item: TaxItemContext = {
  itemPedidoId: 10,
  produtoId: 20,
  descricao: "Produto teste",
  ncm: "30049099",
  quantidade: 2,
  valorUnitario: 50,
  desconto: 10,
};

function rule(overrides: Partial<TaxRuleInput> = {}): TaxRuleInput {
  return {
    id: 1,
    nome: "Venda interna geral",
    prioridade: 100,
    produtoId: null,
    ncmPrefixo: null,
    ufDestino: null,
    contribuinteICMS: null,
    consumidorFinal: null,
    cfop: "5102",
    origemMercadoria: "0",
    cstIcms: "00",
    csosn: null,
    modalidadeBcIcms: "3",
    aliquotaIcms: 18,
    reducaoBaseIcms: 0,
    aliquotaFcp: 2,
    modalidadeBcSt: "4",
    mvaSt: 0,
    aliquotaIcmsSt: 0,
    aliquotaFcpSt: 0,
    aliquotaInterestadual: null,
    aliquotaInternaDestino: null,
    cstIpi: "50",
    aliquotaIpi: 5,
    codigoEnquadramentoIpi: "999",
    cstPis: "01",
    aliquotaPis: 1.65,
    cstCofins: "01",
    aliquotaCofins: 7.6,
    informacoesComplementares: null,
    ...overrides,
  };
}

describe("motor tributario", () => {
  test("seleciona a regra mais especifica antes da regra geral", () => {
    const selected = resolveTaxRule([
      rule(),
      rule({ id: 2, nome: "Produto especifico", produtoId: item.produtoId }),
    ], item, contextNormal);
    assert.equal(selected.id, 2);
  });

  test("recusa regras ambiguas com mesma prioridade e especificidade", () => {
    assert.throws(
      () => resolveTaxRule([rule(), rule({ id: 2, nome: "Outra geral" })], item, contextNormal),
      /Regras tributarias ambiguas/
    );
  });

  test("calcula ICMS, FCP, IPI, PIS e COFINS sobre o valor liquido", () => {
    const result = calculateTaxes({
      natureza: { id: 1, codigo: "VENDA", nome: "Venda", tipoOperacao: "SAIDA", finalidadeNFe: 1 },
      context: contextNormal,
      items: [item],
      rules: [rule()],
    });
    assert.equal(result.totais.valorProdutos, 100);
    assert.equal(result.totais.desconto, 10);
    assert.equal(result.totais.baseIcms, 90);
    assert.equal(result.totais.valorIcms, 16.2);
    assert.equal(result.totais.valorFcp, 1.8);
    assert.equal(result.totais.valorIpi, 4.5);
    assert.equal(result.totais.valorPis, 1.49);
    assert.equal(result.totais.valorCofins, 6.84);
    assert.equal(result.totais.valorNota, 94.5);
  });

  test("Simples Nacional com CSOSN 102 nao destaca base nem ICMS", () => {
    const result = calculateTaxes({
      natureza: { id: 1, codigo: "VENDA", nome: "Venda", tipoOperacao: "SAIDA", finalidadeNFe: 1 },
      context: { ...contextNormal, regimeTributario: "SIMPLES_NACIONAL" },
      items: [item],
      rules: [rule({ cstIcms: null, csosn: "102", aliquotaIcms: 0, aliquotaFcp: 0, cstIpi: "53", aliquotaIpi: 0, cstPis: "07", aliquotaPis: 0, cstCofins: "07", aliquotaCofins: 0 })],
    });
    assert.equal(result.totais.baseIcms, 0);
    assert.equal(result.totais.valorIcms, 0);
    assert.equal(result.totais.valorNota, 90);
  });

  test("recusa CFOP interno em operacao interestadual", () => {
    assert.throws(
      () => calculateTaxes({
        natureza: { id: 1, codigo: "VENDA", nome: "Venda", tipoOperacao: "SAIDA", finalidadeNFe: 1 },
        context: { ...contextNormal, ufDestino: "SP" },
        items: [item],
        rules: [rule()],
      }),
      /CFOP 5102 incompativel/
    );
  });
});
