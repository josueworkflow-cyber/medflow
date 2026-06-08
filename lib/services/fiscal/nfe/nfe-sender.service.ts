import { DOMParser, XMLSerializer } from "@xmldom/xmldom";
import { prisma } from "@/lib/prisma";
import { RetornoSEFAZ } from "./nfe.types";

// URLs dos WebServices da SEFAZ-RJ (via SVRS) para NF-e 4.00 Autorizacao
const WEBSERVICE_URLS: Record<string, string> = {
  homologacao: "https://nfe-homologacao.svrs.rs.gov.br/ws/NfeAutorizacao4/NfeAutorizacao4.asmx",
  producao: "https://nfe.svrs.rs.gov.br/ws/NfeAutorizacao4/NfeAutorizacao4.asmx",
};

/**
 * Envia o XML assinado da NF-e para a SEFAZ via protocolo SOAP/HTTPS.
 * 
 * Regra de seguranca: Nunca loga o XML completo ou credenciais em mensagens de erro/console.
 */
export async function enviarNFe(xmlAssinado: string, empresaEmissoraId: number): Promise<RetornoSEFAZ> {
  try {
    // 1. Busca o ambiente da empresa diretamente no banco de dados (evita ifs baseados em configs locais)
    const empresa = await prisma.empresaFiscal.findUnique({
      where: { id: empresaEmissoraId },
      select: { id: true, ambienteSEFAZ: true }
    });

    if (!empresa) {
      throw new Error(`Empresa emissora ID ${empresaEmissoraId} nao encontrada.`);
    }

    const ambiente = (empresa.ambienteSEFAZ || "homologacao").toLowerCase();
    const url = WEBSERVICE_URLS[ambiente];
    if (!url) {
      throw new Error(`URL do webservice nao configurada para o ambiente: ${ambiente}`);
    }

    // 2. Monta o envelope SOAP 1.2
    const soapEnvelope = `<?xml version="1.0" encoding="utf-8"?>
<soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">
  <soap12:Body>
    <nfeAutorizacaoLote xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/NFeAutorizacao4">
      <nfeDadosMsg>${xmlAssinado}</nfeDadosMsg>
    </nfeAutorizacaoLote>
  </soap12:Body>
</soap12:Envelope>`;

    // 3. Envia a requisicao SOAP via fetch
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": 'application/soap+xml; charset=utf-8; action="http://www.portalfiscal.inf.br/nfe/wsdl/NFeAutorizacao4/nfeAutorizacaoLote"',
      },
      body: soapEnvelope
    });

    if (!response.ok) {
      throw new Error(`Falha de comunicacao com a SEFAZ (HTTP ${response.status})`);
    }

    const responseText = await response.text();

    // 4. Parse do retorno da SEFAZ
    const doc = new DOMParser().parseFromString(responseText, "application/xml");

    // Procura o cStat na resposta
    const cStatNodes = doc.getElementsByTagName("cStat");
    if (cStatNodes.length === 0) {
      throw new Error("Resposta da SEFAZ invalida: elemento <cStat> nao encontrado no XML de retorno.");
    }
    const cStat = cStatNodes[0].textContent?.trim() || "";

    const xMotivoNodes = doc.getElementsByTagName("xMotivo");
    const xMotivo = xMotivoNodes.length > 0 ? xMotivoNodes[0].textContent?.trim() || "" : "";

    // Sucesso da autorizacao da NF-e:
    // - 100: Autorizado o uso da NF-e
    // - 150: Autorizado o uso da NF-e fora do prazo (tratar igual ao 100)
    if (cStat === "100" || cStat === "150") {
      const chNFeNodes = doc.getElementsByTagName("chNFe");
      const nProtNodes = doc.getElementsByTagName("nProt");

      const chaveAcesso = chNFeNodes.length > 0 ? chNFeNodes[0].textContent?.trim() : undefined;
      const protocolo = nProtNodes.length > 0 ? nProtNodes[0].textContent?.trim() : undefined;

      // Extrai o no <protNFe> completo para montar o xmlAutorizado (.nfeProc com validade juridica)
      let protNFeXml = "";
      const protNFeNodes = doc.getElementsByTagName("protNFe");
      if (protNFeNodes.length > 0) {
        protNFeXml = new XMLSerializer().serializeToString(protNFeNodes[0]);
      }

      // O XML final com validade juridica junta o XML assinado + o no do protocolo de resposta da SEFAZ
      const xmlAutorizado = `<nfeProc xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">${xmlAssinado}${protNFeXml}</nfeProc>`;

      return {
        autorizada: true,
        chaveAcesso,
        protocolo,
        xmlAutorizado
      };
    } else {
      // Qualquer outro cStat indica rejeicao/erro (ex: 204, 217, etc.)
      return {
        autorizada: false,
        codigoRejeicao: cStat,
        mensagemRejeicao: xMotivo
      };
    }
  } catch (error: any) {
    // NUNCA logar o XML completo ou dados do certificado nos logs de erro
    console.error(`Erro ao enviar XML da empresa ID ${empresaEmissoraId}: ${error.message || error}`);
    throw new Error(`Erro de transmissao da NF-e: ${error.message || error}`);
  }
}
