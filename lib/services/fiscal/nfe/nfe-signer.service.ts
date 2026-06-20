import { DOMParser } from "@xmldom/xmldom";
import { SignedXml } from "xml-crypto";
import { carregarCertificado } from "../certificado.service";

/**
 * Assina digitalmente o XML de uma NF-e utilizando o certificado digital (A1) da empresa.
 * A assinatura utiliza o algoritmo RSA-SHA1 com digest SHA1, conforme exigencias do layout 4.00 da SEFAZ.
 * 
 * Regra de seguranca: Nunca expoe chaves privadas ou o XML assinado completo nos logs.
 */
export async function assinarXML(xml: string, empresaEmissoraId: number): Promise<string> {
  try {
    const { privateKeyPem, certificatePem } = await carregarCertificado(empresaEmissoraId);

    // Remove cabecalhos, rodapes e quebras de linha para obter o base64 limpo do certificado
    const cleanCertPem = certificatePem
      .replace(/-----BEGIN CERTIFICATE-----/, "")
      .replace(/-----END CERTIFICATE-----/, "")
      .replace(/\r?\n/g, "")
      .trim();

    const doc = new DOMParser().parseFromString(xml, "application/xml");
    const infNFeNodes = doc.getElementsByTagName("infNFe");
    if (infNFeNodes.length === 0) {
      throw new Error("Elemento <infNFe> nao encontrado no XML.");
    }
    const infNFeNode = infNFeNodes[0] as any;
    const id = infNFeNode.getAttribute("Id");
    if (!id) {
      throw new Error("Elemento <infNFe> nao possui o atributo 'Id' (necessario para referencia de assinatura).");
    }

    // Instancia o SignedXml configurando o KeyInfo com o certificado X509
    const sig = new SignedXml({
      getKeyInfoContent: () => `<X509Data><X509Certificate>${cleanCertPem}</X509Certificate></X509Data>`
    });

    sig.privateKey = privateKeyPem;
    
    // Configura a referencia obrigatoria ao ID do infNFe
    sig.addReference({
      xpath: "//*[local-name()='infNFe']",
      transforms: [
        "http://www.w3.org/2000/09/xmldsig#enveloped-signature",
        "http://www.w3.org/2001/10/xml-exc-c14n#"
      ],
      digestAlgorithm: "http://www.w3.org/2000/09/xmldsig#sha1",
      uri: `#${id}`
    });

    // Algoritmos obrigatorios homologados pela SEFAZ
    sig.signatureAlgorithm = "http://www.w3.org/2000/09/xmldsig#rsa-sha1";
    sig.canonicalizationAlgorithm = "http://www.w3.org/2001/10/xml-exc-c14n#";

    sig.computeSignature(xml);
    return sig.getSignedXml();
  } catch (error: any) {
    // NUNCA logar o XML completo ou chaves nos logs de erro
    console.error(`Erro ao assinar XML da empresa ID ${empresaEmissoraId}: ${error.message || error}`);
    throw new Error(`Falha na assinatura do XML: ${error.message || error}`);
  }
}

/**
 * Assina digitalmente o XML de um Evento de NF-e (ex: Cancelamento) utilizando o certificado digital da empresa.
 */
export async function assinarEventoXML(xml: string, empresaEmissoraId: number): Promise<string> {
  try {
    const { privateKeyPem, certificatePem } = await carregarCertificado(empresaEmissoraId);

    const cleanCertPem = certificatePem
      .replace(/-----BEGIN CERTIFICATE-----/, "")
      .replace(/-----END CERTIFICATE-----/, "")
      .replace(/\r?\n/g, "")
      .trim();

    const doc = new DOMParser().parseFromString(xml, "application/xml");
    const infEventoNodes = doc.getElementsByTagName("infEvento");
    if (infEventoNodes.length === 0) {
      throw new Error("Elemento <infEvento> nao encontrado no XML.");
    }
    const infEventoNode = infEventoNodes[0] as any;
    const id = infEventoNode.getAttribute("Id");
    if (!id) {
      throw new Error("Elemento <infEvento> nao possui o atributo 'Id' (necessario para referencia de assinatura).");
    }

    const sig = new SignedXml({
      getKeyInfoContent: () => `<X509Data><X509Certificate>${cleanCertPem}</X509Certificate></X509Data>`
    });

    sig.privateKey = privateKeyPem;
    
    sig.addReference({
      xpath: "//*[local-name()='infEvento']",
      transforms: [
        "http://www.w3.org/2000/09/xmldsig#enveloped-signature",
        "http://www.w3.org/2001/10/xml-exc-c14n#"
      ],
      digestAlgorithm: "http://www.w3.org/2000/09/xmldsig#sha1",
      uri: `#${id}`
    });

    sig.signatureAlgorithm = "http://www.w3.org/2000/09/xmldsig#rsa-sha1";
    sig.canonicalizationAlgorithm = "http://www.w3.org/2001/10/xml-exc-c14n#";

    sig.computeSignature(xml);
    return sig.getSignedXml();
  } catch (error: any) {
    console.error(`Erro ao assinar XML do evento da empresa ID ${empresaEmissoraId}: ${error.message || error}`);
    throw new Error(`Falha na assinatura do XML do evento: ${error.message || error}`);
  }
}

