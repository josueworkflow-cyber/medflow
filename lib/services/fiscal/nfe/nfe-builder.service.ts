import { prisma } from "@/lib/prisma";
import { create } from "xmlbuilder2";
import { empresaFiscalSelect } from "../../../fiscal-select";

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
export async function buildNFeXml(pedidoVendaId: number): Promise<string> {
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
  const cUF = "33"; // Rio de Janeiro (RJ)
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

  // 4. Totais e Descontos
  let vProdTotal = 0;
  let vDescTotal = 0;

  for (const item of pedido.itens) {
    vProdTotal += item.subtotal;
    vDescTotal += item.desconto || 0;
  }

  const vNF = vProdTotal - vDescTotal;

  // 5. Montagem do XML
  const doc = create({ version: "1.0", encoding: "UTF-8" })
    .ele("NFe", { xmlns: "http://www.portalfiscal.inf.br/nfe" })
      .ele("infNFe", { Id: `NFe${chave}`, versao: "4.00" })
        .ele("ide")
          .ele("cUF").txt(cUF).up()
          .ele("cNF").txt(cNF).up()
          .ele("natOp").txt("Venda de Mercadoria").up()
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
          .ele("finNFe").txt("1").up() // 1 = Normal
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
          const nItem = index + 1;
          const produto = item.produto;

          doc.ele("det", { nItem: nItem.toString() })
            .ele("prod")
              .ele("cProd").txt(produto.codigoInterno || produto.id.toString()).up()
              .ele("cEAN").txt(produto.codigoBarras || "SEM GTIN").up()
              .ele("xProd").txt(produto.descricao).up()
              .ele("NCM").txt(cleanDigits(produto.ncm)).up()
              .ele("CFOP").txt(produto.cfop || (idDest === "1" ? "5102" : "6102")).up()
              .ele("uCom").txt(produto.unidadeFiscal || produto.unidadeVenda || "UN").up()
              .ele("qCom").txt(item.quantidade.toFixed(4)).up()
              .ele("vUnCom").txt(item.precoUnitario.toFixed(4)).up()
              .ele("vProd").txt(item.subtotal.toFixed(2)).up()
              .ele("cEANTrib").txt(produto.codigoBarras || "SEM GTIN").up()
              .ele("uTrib").txt(produto.unidadeFiscal || produto.unidadeVenda || "UN").up()
              .ele("qTrib").txt(item.quantidade.toFixed(4)).up()
              .ele("vUnTrib").txt(item.precoUnitario.toFixed(4)).up()
              .ele("indTot").txt("1").up()
            .up() // fim prod
            .ele("imposto")
              .ele("ICMS");
                if (produto.csosn) {
                  // Emitter Simples Nacional -> ICMSSN102
                  doc.ele(`ICMSSN${produto.csosn === "102" || produto.csosn === "103" || produto.csosn === "300" || produto.csosn === "400" ? produto.csosn : "102"}`)
                    .ele("orig").txt(produto.origemMercadoria || "0").up()
                    .ele("CSOSN").txt(produto.csosn).up()
                  .up();
                } else {
                  // Fallback para ICMS40 (Isento)
                  doc.ele("ICMS40")
                    .ele("orig").txt(produto.origemMercadoria || "0").up()
                    .ele("CST").txt(produto.cst || "40").up()
                  .up();
                }
              doc.up() // fim ICMS
              .ele("PIS")
                .ele("PISNT")
                  .ele("CST").txt("07").up()
                .up()
              .up() // fim PIS
              .ele("COFINS")
                .ele("COFINSNT")
                  .ele("CST").txt("07").up()
                .up()
              .up() // fim COFINS
            .up() // fim imposto
          .up(); // fim det
        });

        // 7. Totais e Pagamentos
        doc.ele("total")
          .ele("ICMSTot")
            .ele("vBC").txt("0.00").up()
            .ele("vICMS").txt("0.00").up()
            .ele("vFCP").txt("0.00").up()
            .ele("vBCST").txt("0.00").up()
            .ele("vST").txt("0.00").up()
            .ele("vFCPST").txt("0.00").up()
            .ele("vFCPSTRet").txt("0.00").up()
            .ele("vProd").txt(vProdTotal.toFixed(2)).up()
            .ele("vFrete").txt("0.00").up()
            .ele("vSeg").txt("0.00").up()
            .ele("vDesc").txt(vDescTotal.toFixed(2)).up()
            .ele("vII").txt("0.00").up()
            .ele("vIPI").txt("0.00").up()
            .ele("vIPIDevol").txt("0.00").up()
            .ele("vPIS").txt("0.00").up()
            .ele("vCOFINS").txt("0.00").up()
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
            .ele("vPag").txt(pedido.valorTotal.toFixed(2)).up()
          .up()
        .up(); // fim pag

  return doc.end({ prettyPrint: true });
}
