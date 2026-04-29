import { XMLBuilder } from "fast-xml-parser";

export interface NFeGenerationData {
  vendaId: number;
  numero: string;
  dataEmissao: Date;
  cliente: {
    razaoSocial: string;
    cnpjCpf: string;
    logradouro: string;
    numero: string;
    bairro: string;
    cidade: string;
    uf: string;
    cep: string;
    email?: string;
  };
  itens: {
    codigo: string;
    descricao: string;
    ncm: string;
    cfop: string;
    unidade: string;
    quantidade: number;
    valorUnitario: number;
    valorTotal: number;
  }[];
  total: number;
}

export function generateNFeXML(data: NFeGenerationData): string {
  const builder = new XMLBuilder({
    ignoreAttributes: false,
    format: true,
  });

  const obj = {
    nfeProc: {
      NFe: {
        infNFe: {
          Id: `NFe${data.numero.padStart(44, '0')}`,
          versao: "4.00",
          ide: {
            cUF: "35", // Ex: SP
            cNF: data.numero.padStart(8, '0'),
            natOp: "VENDA DE MERCADORIA",
            mod: "55",
            serie: "1",
            nNF: data.numero,
            dhEmi: data.dataEmissao.toISOString(),
            tpNF: "1", // Saída
            idDest: "1", // Interna
            cMunFG: "3550308", // Ex: São Paulo
            tpImp: "1",
            tpEmis: "1",
            tpAmb: "2", // Homologação
            finNFe: "1",
            indFinal: "1",
            indPres: "1",
            procEmi: "0",
            verProc: "MedFlow_1.0",
          },
          emit: {
            CNPJ: "00000000000191", // Dados fixos da distribuidora (MedFlow)
            xNome: "MedFlow Distribuidora Hospitalar Ltda",
            xFant: "MedFlow",
            enderEmit: {
              xLgr: "Rua das Flores",
              nro: "100",
              xBairro: "Jardim Paulista",
              cMun: "3550308",
              xMun: "SAO PAULO",
              UF: "SP",
              CEP: "01414000",
              cPais: "1058",
              xPais: "BRASIL",
            },
            IE: "1234567890",
            CRT: "3",
          },
          dest: {
            CNPJ: data.cliente.cnpjCpf.length > 11 ? data.cliente.cnpjCpf : undefined,
            CPF: data.cliente.cnpjCpf.length <= 11 ? data.cliente.cnpjCpf : undefined,
            xNome: data.cliente.razaoSocial,
            enderDest: {
              xLgr: data.cliente.logradouro,
              nro: data.cliente.numero,
              xBairro: data.cliente.bairro,
              cMun: "3550308",
              xMun: data.cliente.cidade,
              UF: data.cliente.uf,
              CEP: data.cliente.cep,
              cPais: "1058",
              xPais: "BRASIL",
            },
            indIEDest: "9",
            email: data.cliente.email,
          },
          det: data.itens.map((item, index) => ({
            nItem: (index + 1).toString(),
            prod: {
              cProd: item.codigo,
              cEAN: "SEM GTIN",
              xProd: item.descricao,
              NCM: item.ncm,
              CFOP: item.cfop,
              uCom: item.unidade,
              qCom: item.quantidade.toFixed(4),
              vUnCom: item.valorUnitario.toFixed(10),
              vProd: item.valorTotal.toFixed(2),
              cEANTrib: "SEM GTIN",
              uTrib: item.unidade,
              qTrib: item.quantidade.toFixed(4),
              vUnTrib: item.valorUnitario.toFixed(10),
              indTot: "1",
            },
            imposto: {
              ICMS: {
                ICMS00: {
                  orig: "0",
                  CST: "00",
                  modBC: "3",
                  vBC: item.valorTotal.toFixed(2),
                  pICMS: "18.00",
                  vICMS: (item.valorTotal * 0.18).toFixed(2),
                }
              },
              IPI: { cEnq: "999", IPITrib: { CST: "99", vBC: "0.00", pIPI: "0.00", vIPI: "0.00" } },
              PIS: { PISOutr: { CST: "99", vBC: "0.00", pPIS: "0.00", vPIS: "0.00" } },
              COFINS: { COFINSOutr: { CST: "99", vBC: "0.00", pCOFINS: "0.00", vCOFINS: "0.00" } },
            },
          })),
          total: {
            ICMSTot: {
              vBC: data.total.toFixed(2),
              vICMS: (data.total * 0.18).toFixed(2),
              vICMSDeson: "0.00",
              vFCP: "0.00",
              vBCST: "0.00",
              vST: "0.00",
              vFCPST: "0.00",
              vFCPSTRet: "0.00",
              vProd: data.total.toFixed(2),
              vFrete: "0.00",
              vSeg: "0.00",
              vDesc: "0.00",
              vII: "0.00",
              vIPI: "0.00",
              vIPIDevol: "0.00",
              vPIS: "0.00",
              vCOFINS: "0.00",
              vOutro: "0.00",
              vNF: data.total.toFixed(2),
            }
          },
          transp: { modFrete: "9" },
          pag: {
            detPag: {
              indPag: "1",
              tPag: "15",
              vPag: data.total.toFixed(2),
            }
          },
          infAdic: { infCpl: "MedFlow ERP - Desenvolvimento Homologacao" },
        }
      }
    }
  };

  return builder.build(obj);
}
