import { XMLParser } from "fast-xml-parser";

export interface NFeData {
  chave: string;
  numero: string;
  dataEmissao: string;
  emitente: {
    cnpj: string;
    razaoSocial: string;
    nomeFantasia?: string;
    logradouro: string;
    numero: string;
    bairro: string;
    cidade: string;
    uf: string;
    cep: string;
  };
  produtos: {
    codigo: string;
    ean?: string;
    descricao: string;
    ncm: string;
    cfop: string;
    unidade: string;
    quantidade: number;
    valorUnitario: number;
    valorTotal: number;
    lote?: string;
    validade?: string;
  }[];
  valorTotal: number;
}

export function parseNFeXML(xmlContent: string): NFeData {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "",
  });
  
  const jsonObj = parser.parse(xmlContent);
  const nfe = jsonObj.nfeProc?.NFe?.infNFe || jsonObj.NFe?.infNFe;

  if (!nfe) throw new Error("XML de NF-e inválido ou não suportado.");

  const ide = nfe.ide;
  const emit = nfe.emit;
  const det = Array.isArray(nfe.det) ? nfe.det : [nfe.det];
  const total = nfe.total.ICMSTot;

  return {
    chave: nfe.Id?.replace("NFe", ""),
    numero: ide.nNF.toString(),
    dataEmissao: ide.dhEmi || ide.dEmi,
    emitente: {
      cnpj: emit.CNPJ,
      razaoSocial: emit.xNome,
      nomeFantasia: emit.xFant,
      logradouro: emit.enderEmit.xLgr,
      numero: emit.enderEmit.nro.toString(),
      bairro: emit.enderEmit.xBairro,
      cidade: emit.enderEmit.xMun,
      uf: emit.enderEmit.UF,
      cep: emit.enderEmit.CEP.toString(),
    },
    produtos: det.map((d: any) => ({
      codigo: d.prod.cProd.toString(),
      ean: d.prod.cEAN?.toString(),
      descricao: d.prod.xProd,
      ncm: d.prod.NCM?.toString(),
      cfop: d.prod.CFOP?.toString(),
      unidade: d.prod.uCom,
      quantidade: Number(d.prod.qCom),
      valorUnitario: Number(d.prod.vUnCom),
      valorTotal: Number(d.prod.vProd),
      // Alguns XMLs de saúde trazem o lote no rastro
      lote: d.prod.rastro?.nLote || undefined,
      validade: d.prod.rastro?.dVal || undefined,
    })),
    valorTotal: Number(total.vNF),
  };
}
