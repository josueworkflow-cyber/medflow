import { prisma } from "@/lib/prisma";
import { create } from "xmlbuilder2";
import { empresaFiscalSelect } from "../../../fiscal-select";
import type { TaxCalculationResult, TaxItemCalculation } from "@/lib/types/fiscal-tax";

/**
 * Mapeamento de FormaPagamento do MedFlow para o código tPag da SEFAZ.
 */
const MAPA_PAGAMENTO: Record<string, string> = {
  PIX: "17",
  TRANSFERENCIA: "17",
  BOLETO: "15",
  CARTAO_CREDITO: "03",
  CARTAO_DEBITO: "04",
  DINHEIRO: "01",
  A_PRAZO: "90",
  CHEQUE: "02"
};

/**
 * Helper para obter apenas dígitos numéricos de uma string.
 */
function cleanDigits(str: string | null | undefined): string {
  if (!str) return "";
  return str.replace(/\D/g, "");
}

function money(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export type NFeBuildOptions = {
  naturezaOperacao?: string | null;
  informacoesComplementares?: string | null;
  calculoTributario?: TaxCalculationResult | null;
};

function appendIcms(doc: any, tax: TaxItemCalculation, simplesNacional: boolean) {
  const icms = doc.ele("ICMS");
  if (simplesNacional) {
    icms.ele(`ICMSSN${tax.csosn}`)
      .ele("orig").txt(tax.origemMercadoria).up()
      .ele("CSOSN").txt(tax.csosn).up()
    .up();
  } else if (tax.cstIcms === "00") {
    const group = icms.ele("ICMS00")
      .ele("orig").txt(tax.origemMercadoria).up()
      .ele("CST").txt("00").up()
      .ele("modBC").txt(tax.modalidadeBcIcms).up()
      .ele("vBC").txt(tax.baseIcms.toFixed(2)).up()
      .ele("pICMS").txt(tax.aliquotaIcms.toFixed(2)).up()
      .ele("vICMS").txt(tax.valorIcms.toFixed(2)).up();
    if (tax.aliquotaFcp > 0) {
      group.ele("vBCFCP").txt(tax.baseIcms.toFixed(2)).up()
        .ele("pFCP").txt(tax.aliquotaFcp.toFixed(2)).up()
        .ele("vFCP").txt(tax.valorFcp.toFixed(2)).up();
    }
    group.up();
  } else if (tax.cstIcms === "20") {
    const group = icms.ele("ICMS20")
      .ele("orig").txt(tax.origemMercadoria).up()
      .ele("CST").txt("20").up()
      .ele("modBC").txt(tax.modalidadeBcIcms).up()
      .ele("pRedBC").txt(tax.reducaoBaseIcms.toFixed(2)).up()
      .ele("vBC").txt(tax.baseIcms.toFixed(2)).up()
      .ele("pICMS").txt(tax.aliquotaIcms.toFixed(2)).up()
      .ele("vICMS").txt(tax.valorIcms.toFixed(2)).up();
    if (tax.aliquotaFcp > 0) {
      group.ele("vBCFCP").txt(tax.baseIcms.toFixed(2)).up()
        .ele("pFCP").txt(tax.aliquotaFcp.toFixed(2)).up()
        .ele("vFCP").txt(tax.valorFcp.toFixed(2)).up();
    }
    group.up();
  } else if (tax.cstIcms === "10") {
    const group = icms.ele("ICMS10")
      .ele("orig").txt(tax.origemMercadoria).up()
      .ele("CST").txt("10").up()
      .ele("modBC").txt(tax.modalidadeBcIcms).up()
      .ele("vBC").txt(tax.baseIcms.toFixed(2)).up()
      .ele("pICMS").txt(tax.aliquotaIcms.toFixed(2)).up()
      .ele("vICMS").txt(tax.valorIcms.toFixed(2)).up();
    if (tax.aliquotaFcp > 0) {
      group.ele("vBCFCP").txt(tax.baseIcms.toFixed(2)).up()
        .ele("pFCP").txt(tax.aliquotaFcp.toFixed(2)).up()
        .ele("vFCP").txt(tax.valorFcp.toFixed(2)).up();
    }
    group.ele("modBCST").txt(tax.modalidadeBcSt).up()
      .ele("pMVAST").txt(tax.mvaSt.toFixed(2)).up()
      .ele("vBCST").txt(tax.baseIcmsSt.toFixed(2)).up()
      .ele("pICMSST").txt(tax.aliquotaIcmsSt.toFixed(2)).up()
      .ele("vICMSST").txt(tax.valorIcmsSt.toFixed(2)).up();
    if (tax.aliquotaFcpSt > 0) {
      group.ele("vBCFCPST").txt(tax.baseIcmsSt.toFixed(2)).up()
        .ele("pFCPST").txt(tax.aliquotaFcpSt.toFixed(2)).up()
        .ele("vFCPST").txt(tax.valorFcpSt.toFixed(2)).up();
    }
    group.up();
  } else {
    icms.ele(`ICMS${tax.cstIcms}`)
      .ele("orig").txt(tax.origemMercadoria).up()
      .ele("CST").txt(tax.cstIcms).up()
    .up();
  }
  icms.up();

  if (tax.valorDifalDestino > 0 && tax.aliquotaInterestadual !== null && tax.aliquotaInternaDestino !== null) {
    doc.ele("ICMSUFDest")
      .ele("vBCUFDest").txt(tax.baseIcms.toFixed(2)).up()
      .ele("vBCFCPUFDest").txt(tax.baseIcms.toFixed(2)).up()
      .ele("pFCPUFDest").txt(tax.aliquotaFcp.toFixed(2)).up()
      .ele("pICMSUFDest").txt(tax.aliquotaInternaDestino.toFixed(2)).up()
      .ele("pICMSInter").txt(tax.aliquotaInterestadual.toFixed(2)).up()
      .ele("pICMSInterPart").txt("100.00").up()
      .ele("vFCPUFDest").txt(tax.valorFcp.toFixed(2)).up()
      .ele("vICMSUFDest").txt(tax.valorDifalDestino.toFixed(2)).up()
      .ele("vICMSUFRemet").txt("0.00").up()
    .up();
  }
}

function appendIpi(doc: any, tax: TaxItemCalculation) {
  const ipi = doc.ele("IPI").ele("cEnq").txt(tax.codigoEnquadramentoIpi).up();
  if (["50", "99"].includes(tax.cstIpi)) {
    ipi.ele("IPITrib")
      .ele("CST").txt(tax.cstIpi).up()
      .ele("vBC").txt(tax.baseIpi.toFixed(2)).up()
      .ele("pIPI").txt(tax.aliquotaIpi.toFixed(2)).up()
      .ele("vIPI").txt(tax.valorIpi.toFixed(2)).up()
    .up();
  } else {
    ipi.ele("IPINT").ele("CST").txt(tax.cstIpi).up().up();
  }
  ipi.up();
}

function appendContribution(doc: any, tax: TaxItemCalculation, kind: "PIS" | "COFINS") {
  const cst = kind === "PIS" ? tax.cstPis : tax.cstCofins;
  const base = kind === "PIS" ? tax.basePis : tax.baseCofins;
  const rate = kind === "PIS" ? tax.aliquotaPis : tax.aliquotaCofins;
  const value = kind === "PIS" ? tax.valorPis : tax.valorCofins;
  const root = doc.ele(kind);
  if (["01", "02"].includes(cst)) {
    root.ele(`${kind}Aliq`)
      .ele("CST").txt(cst).up()
      .ele("vBC").txt(base.toFixed(2)).up()
      .ele(`p${kind}`).txt(rate.toFixed(2)).up()
      .ele(`v${kind}`).txt(value.toFixed(2)).up()
    .up();
  } else if (["04", "05", "06", "07", "08", "09"].includes(cst)) {
    root.ele(`${kind}NT`).ele("CST").txt(cst).up().up();
  } else {
    root.ele(`${kind}Outr`)
      .ele("CST").txt(cst).up()
      .ele("vBC").txt(base.toFixed(2)).up()
      .ele(`p${kind}`).txt(rate.toFixed(2)).up()
      .ele(`v${kind}`).txt(value.toFixed(2)).up()
    .up();
  }
  root.up();
}

function normalizeText(value: string | null | undefined, fallback = "", maxLength?: number): string {
  const normalized = (value || fallback).replace(/\s+/g, " ").trim();
  return maxLength ? normalized.slice(0, maxLength) : normalized;
}

/**
 * Calcula o dígito verificador (DV) de uma chave de acesso de 43 dígitos usando Módulo 11.
 * O multiplicador vai de 2 a 9, reiniciando no 2.
 */
export function calcularDV(chave43: string): number {
  let soma = 0;
  let peso = 2;
  
  for (let i = chave43.length - 1; i >= 0; i--) {
    const digito = parseInt(chave43.charAt(i), 10);
    soma += digito * peso;
    peso = peso === 9 ? 2 : peso + 1;
  }
  
  const resto = soma % 11;
  if (resto === 0 || resto === 1) {
    return 0;
  }
  return 11 - resto;
}

/**
 * Gera a chave de acesso da NF-e com 44 dígitos e retorna a chave e o cDV.
 */
export function calcularChaveAcesso(params: {
  cUF: string;
  dhEmi: Date;
  cnpj: string;
  mod: string;
  serie: string;
  nNF: number;
  tpEmis: string;
  cNF: string;
}): { chave: string; cDV: string } {
  // cUF: 2 dígitos
  const cUF = params.cUF.padStart(2, "0");
  
  // AAMM: Ano e Mês da data de emissão
  const ano = String(params.dhEmi.getFullYear()).slice(-2);
  const mes = String(params.dhEmi.getMonth() + 1).padStart(2, "0");
  const aamm = `${ano}${mes}`;
  
  // CNPJ: 14 dígitos
  const cnpjClean = cleanDigits(params.cnpj).padStart(14, "0");
  
  // mod: 2 dígitos
  const mod = params.mod.padStart(2, "0");
  
  // serie: 3 dígitos
  const serie = params.serie.padStart(3, "0");
  
  // nNF: 9 dígitos
  const nNF = String(params.nNF).padStart(9, "0");
  
  // tpEmis: 1 dígito
  const tpEmis = params.tpEmis.padStart(1, "0");
  
  // cNF: 8 dígitos
  const cNF = params.cNF.padStart(8, "0");
  
  const chave43 = `${cUF}${aamm}${cnpjClean}${mod}${serie}${nNF}${tpEmis}${cNF}`;
  const dv = calcularDV(chave43);
  
  return {
    chave: `${chave43}${dv}`,
    cDV: String(dv)
  };
}

/**
 * Formata a data e hora em formato ISO 8601 com fuso horário (UTC ou Offset local).
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
 * Constrói o XML da NF-e no layout 4.00 a partir dos dados do PedidoVenda.
 */
export async function buildNFeXml(pedidoVendaId: number, options: NFeBuildOptions = {}): Promise<string> {
  // 1. Carrega o pedido completo do banco
  const pedido = await prisma.pedidoVenda.findUnique({
    where: { id: pedidoVendaId },
    include: {
      cliente: true,
      vendedor: { select: { nome: true } },
      empresaFiscal: { select: empresaFiscalSelect },
      itens: {
        include: {
          produto: true
        }
      }
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

  // 2. Validações Fiscais
  // Valida NCM nos produtos
  for (const item of pedido.itens) {
    if (!item.produto.ncm || cleanDigits(item.produto.ncm).length !== 8) {
      throw new Error(`Produto ${item.produto.id} não possui NCM cadastrado`);
    }
  }

  // Valida endereço do destinatário
  if (
    !cliente.logradouro ||
    !cliente.numero ||
    !cliente.bairro ||
    !cliente.codigoMunicipio ||
    !cliente.estado ||
    !cliente.cep
  ) {
    throw new Error(`Cliente ${cliente.id} sem endereço fiscal completo`);
  }

  // Valida dados obrigatórios do emitente
  if (
    !emitente.logradouro ||
    !emitente.numero ||
    !emitente.bairro ||
    !emitente.codigoMunicipio ||
    !emitente.uf ||
    !emitente.cep
  ) {
    throw new Error(`Empresa emissora ${emitente.id} sem endereço fiscal completo`);
  }

  // 3. Preparação dos dados para a Chave de Acesso e Cabeçalho
  const cUF = cleanDigits(emitente.codigoMunicipio).slice(0, 2);
  if (cUF.length !== 2) throw new Error("Codigo de municipio do emitente invalido para determinar a UF.");
  const dhEmiStr = formatarDataHora(new Date());
  const dhEmi = new Date();
  
  // cNF: 8 dígitos aleatórios
  const cNF = Math.floor(10000000 + Math.random() * 90000000).toString();
  const mod = "55";
  const serie = emitente.serieNFe || "1";
  const nNF = (emitente.numeroUltimaNFe || 0) + 1;
  const tpEmis = "1"; // Emissão normal

  const { chave, cDV } = calcularChaveAcesso({
    cUF,
    dhEmi,
    cnpj: emitente.cnpj,
    mod,
    serie,
    nNF,
    tpEmis,
    cNF
  });

  // Determinar idDest (1 = interna, 2 = interestadual)
  const idDest = cliente.estado.toUpperCase() === "RJ" ? "1" : "2";

  // CRT (Regime Tributário): 1 = Simples Nacional, 3 = Regime Normal
  const crt = emitente.regimeTributario === "SIMPLES_NACIONAL" ? "1" : "3";

  // Identificação do tipo de documento do destinatário (CNPJ ou CPF)
  const cnpjCpfClean = cleanDigits(cliente.cnpjCpf);
  const isCnpj = cnpjCpfClean.length === 14;

  // indIEDest (1 = Contribuinte, 9 = Não Contribuinte)
  const indIEDest = cliente.contribuinteICMS ? "1" : "9";
  const naturezaOperacao = normalizeText(options.naturezaOperacao, "Venda de Mercadoria", 60);
  const informacoesComplementares = normalizeText(options.informacoesComplementares || pedido.observacao, "", 5000);

  // 4. Totais e Descontos
  const calculoTributario = options.calculoTributario || null;
  const taxByItemId = new Map(calculoTributario?.itens.map((item) => [item.itemPedidoId, item]) || []);
  let vProdTotal = calculoTributario?.totais.valorProdutos || 0;
  let vDescTotal = calculoTributario?.totais.desconto || 0;
  let vBCTotal = calculoTributario?.totais.baseIcms || 0;
  let vICMSTotal = calculoTributario?.totais.valorIcms || 0;

  if (!calculoTributario) {
    vDescTotal = pedido.desconto || 0;
    for (const item of pedido.itens) {
      const valorBrutoItem = money(item.quantidade * item.precoUnitario);
      const descontoItem = item.desconto || 0;
      const valorLiquidoItem = Math.max(0, money(valorBrutoItem - descontoItem));
      const aliquotaIcms = Number(item.produto.aliquotaIcms || 0);
      const destacaIcms = aliquotaIcms > 0 && !item.produto.csosn;
      vProdTotal += valorBrutoItem;
      vDescTotal += descontoItem;
      if (destacaIcms) {
        vBCTotal += valorLiquidoItem;
        vICMSTotal += money(valorLiquidoItem * aliquotaIcms / 100);
      }
    }
  }

  const vNF = calculoTributario?.totais.valorNota ?? Math.max(0, money(vProdTotal - vDescTotal));

  // 5. Montagem do XML
  const doc = create({ version: "1.0", encoding: "UTF-8" })
    .ele("NFe", { xmlns: "http://www.portalfiscal.inf.br/nfe" })
      .ele("infNFe", { Id: `NFe${chave}`, versao: "4.00" })
        .ele("ide")
          .ele("cUF").txt(cUF).up()
          .ele("cNF").txt(cNF).up()
          .ele("natOp").txt(naturezaOperacao).up()
          .ele("mod").txt(mod).up()
          .ele("serie").txt(parseInt(serie, 10).toString()).up()
          .ele("nNF").txt(nNF.toString()).up()
          .ele("dhEmi").txt(dhEmiStr).up()
          .ele("tpNF").txt("1").up() // 1 = Saída
          .ele("idDest").txt(idDest).up()
          .ele("cMunFG").txt(cleanDigits(emitente.codigoMunicipio)).up()
          .ele("tpImp").txt("1").up() // 1 = Retrato
          .ele("tpEmis").txt(tpEmis).up()
          .ele("cDV").txt(cDV).up()
          .ele("tpAmb").txt(emitente.ambienteSEFAZ === "producao" ? "1" : "2").up()
          .ele("finNFe").txt(String(calculoTributario?.natureza.finalidadeNFe || 1)).up()
          .ele("indFinal").txt(cliente.consumidorFinal ? "1" : "0").up()
          .ele("indPres").txt("9").up() // 9 = Operação não presencial
          .ele("procEmi").txt("0").up() // 0 = Emissão de aplicativo do contribuinte
          .ele("verProc").txt("1.0").up()
        .up() // fim ide
        .ele("emit")
          .ele("CNPJ").txt(cleanDigits(emitente.cnpj)).up()
          .ele("xNome").txt(emitente.razaoSocial).up()
          .ele("xFant").txt(emitente.nomeFantasia || emitente.razaoSocial).up()
          .ele("enderEmit")
            .ele("xLgr").txt(emitente.logradouro).up()
            .ele("nro").txt(emitente.numero).up()
            if (emitente.complemento) {
              doc.ele("xCpl").txt(emitente.complemento).up();
            }
            doc.ele("xBairro").txt(emitente.bairro).up()
            .ele("cMun").txt(cleanDigits(emitente.codigoMunicipio)).up()
            .ele("xMun").txt(emitente.municipio || "").up()
            .ele("UF").txt(emitente.uf.toUpperCase()).up()
            .ele("CEP").txt(cleanDigits(emitente.cep)).up()
          .up() // fim enderEmit
          .ele("IE").txt(cleanDigits(emitente.inscricaoEstadual)).up()
          .ele("CRT").txt(crt).up()
        .up() // fim emit
        .ele("dest")
          .ele(isCnpj ? "CNPJ" : "CPF").txt(cnpjCpfClean).up()
          .ele("xNome").txt(cliente.razaoSocial).up()
          .ele("enderDest")
            .ele("xLgr").txt(cliente.logradouro).up()
            .ele("nro").txt(cliente.numero).up()
            if (cliente.complemento) {
              doc.ele("xCpl").txt(cliente.complemento).up();
            }
            doc.ele("xBairro").txt(cliente.bairro).up()
            .ele("cMun").txt(cleanDigits(cliente.codigoMunicipio)).up()
            .ele("xMun").txt(cliente.cidade || "").up()
            .ele("UF").txt(cliente.estado.toUpperCase()).up()
            .ele("CEP").txt(cleanDigits(cliente.cep)).up()
          .up() // fim enderDest
          .ele("indIEDest").txt(indIEDest).up()
          if (cliente.contribuinteICMS && cliente.inscricaoEstadual) {
            doc.ele("IE").txt(cleanDigits(cliente.inscricaoEstadual)).up();
          }
        doc.up(); // fim dest

        // 6. Loop de Itens (det)
        pedido.itens.forEach((item, index) => {
          const produto = item.produto;
          const tax = taxByItemId.get(item.id);
          if (calculoTributario && !tax) throw new Error(`Calculo tributario ausente para o item ${item.id}.`);
          const valorBrutoItem = tax?.valorBruto ?? money(item.quantidade * item.precoUnitario);
          const descontoItem = tax?.desconto ?? item.desconto ?? 0;
          const valorLiquidoItem = tax?.valorLiquido ?? Math.max(0, money(valorBrutoItem - descontoItem));
          const aliquotaIcms = Number(produto.aliquotaIcms || 0);
          const valorIcms = money(valorLiquidoItem * aliquotaIcms / 100);
          const destacaIcms = aliquotaIcms > 0 && !produto.csosn;
          const det = doc.ele("det", { nItem: String(index + 1) });
          const prodNode = det.ele("prod")
            .ele("cProd").txt(produto.codigoInterno || produto.id.toString()).up()
            .ele("cEAN").txt(produto.codigoBarras || "SEM GTIN").up()
            .ele("xProd").txt(produto.descricao).up()
            .ele("NCM").txt(cleanDigits(produto.ncm)).up()
            .ele("CFOP").txt(tax?.cfop || produto.cfop || (idDest === "1" ? "5102" : "6102")).up()
            .ele("uCom").txt(produto.unidadeFiscal || produto.unidadeVenda || "UN").up()
            .ele("qCom").txt(item.quantidade.toFixed(4)).up()
            .ele("vUnCom").txt(item.precoUnitario.toFixed(4)).up()
            .ele("vProd").txt(valorBrutoItem.toFixed(2)).up()
            .ele("cEANTrib").txt(produto.codigoBarras || "SEM GTIN").up()
            .ele("uTrib").txt(produto.unidadeFiscal || produto.unidadeVenda || "UN").up()
            .ele("qTrib").txt(item.quantidade.toFixed(4)).up()
            .ele("vUnTrib").txt(item.precoUnitario.toFixed(4)).up();
          if (descontoItem > 0) prodNode.ele("vDesc").txt(descontoItem.toFixed(2)).up();
          prodNode.ele("indTot").txt("1").up();

          const imposto = det.ele("imposto");
          if (tax) {
            appendIcms(imposto, tax, crt === "1");
            appendIpi(imposto, tax);
            appendContribution(imposto, tax, "PIS");
            appendContribution(imposto, tax, "COFINS");
          } else {
            const icms = imposto.ele("ICMS");
            if (produto.csosn) {
              icms.ele(`ICMSSN${["102", "103", "300", "400"].includes(produto.csosn) ? produto.csosn : "102"}`)
                .ele("orig").txt(produto.origemMercadoria || "0").up()
                .ele("CSOSN").txt(produto.csosn).up().up();
            } else if (destacaIcms) {
              icms.ele("ICMS00")
                .ele("orig").txt(produto.origemMercadoria || "0").up()
                .ele("CST").txt(produto.cst || "00").up()
                .ele("modBC").txt("3").up()
                .ele("vBC").txt(valorLiquidoItem.toFixed(2)).up()
                .ele("pICMS").txt(aliquotaIcms.toFixed(2)).up()
                .ele("vICMS").txt(valorIcms.toFixed(2)).up().up();
            } else {
              icms.ele("ICMS40")
                .ele("orig").txt(produto.origemMercadoria || "0").up()
                .ele("CST").txt(produto.cst || "40").up().up();
            }
            imposto.ele("PIS").ele("PISNT").ele("CST").txt("07").up().up().up();
            imposto.ele("COFINS").ele("COFINSNT").ele("CST").txt("07").up().up().up();
          }
        });

        // 7. Totais e Pagamentos
        doc.ele("total")
          .ele("ICMSTot")
            .ele("vBC").txt(vBCTotal.toFixed(2)).up()
            .ele("vICMS").txt(vICMSTotal.toFixed(2)).up()
            .ele("vFCP").txt((calculoTributario?.totais.valorFcp || 0).toFixed(2)).up()
            .ele("vBCST").txt((calculoTributario?.totais.baseIcmsSt || 0).toFixed(2)).up()
            .ele("vST").txt((calculoTributario?.totais.valorIcmsSt || 0).toFixed(2)).up()
            .ele("vFCPST").txt((calculoTributario?.totais.valorFcpSt || 0).toFixed(2)).up()
            .ele("vFCPSTRet").txt("0.00").up()
            .ele("vProd").txt(vProdTotal.toFixed(2)).up()
            .ele("vFrete").txt("0.00").up()
            .ele("vSeg").txt("0.00").up()
            .ele("vDesc").txt(vDescTotal.toFixed(2)).up()
            .ele("vII").txt("0.00").up()
            .ele("vIPI").txt((calculoTributario?.totais.valorIpi || 0).toFixed(2)).up()
            .ele("vIPIDevol").txt("0.00").up()
            .ele("vPIS").txt((calculoTributario?.totais.valorPis || 0).toFixed(2)).up()
            .ele("vCOFINS").txt((calculoTributario?.totais.valorCofins || 0).toFixed(2)).up()
            .ele("vOutro").txt("0.00").up()
            .ele("vNF").txt(vNF.toFixed(2)).up()
            .ele("vTotTrib").txt("0.00").up()
          .up() // fim ICMSTot
        .up() // fim total
        .ele("transp")
          .ele("modFrete").txt("9").up() // 9 = Sem frete
        .up() // fim transp
        .ele("pag")
            .ele("detPag")
              .ele("tPag").txt(MAPA_PAGAMENTO[pedido.formaPagamento || ""] || "99").up()
              .ele("vPag").txt(vNF.toFixed(2)).up()
          .up()
        .up(); // fim pag

        if (informacoesComplementares) {
          doc.ele("infAdic")
            .ele("infCpl").txt(informacoesComplementares).up()
          .up();
        }

  return doc.end({ prettyPrint: true });
}
