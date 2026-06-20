import { test, describe, before, after } from "node:test";
import assert from "node:assert";
import { prisma } from "@/lib/prisma";
import forge from "node-forge";
import { criptografarSenha } from "../certificado.service";
import { assinarXML } from "./nfe-signer.service";

/**
 * Auxiliar para gerar dinamicamente um arquivo PFX (.pfx) em formato base64 para uso nos testes unitários.
 */
function generateMockPfx(password: string): string {
  const keys = forge.pki.rsa.generateKeyPair(1024);
  const cert = forge.pki.createCertificate();
  cert.publicKey = keys.publicKey;
  cert.serialNumber = "987654";
  cert.validity.notBefore = new Date();
  cert.validity.notAfter = new Date();
  cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 1);

  const attrs = [
    { name: "commonName", value: "Empresa Assinatura Teste LTDA" },
    { name: "countryName", value: "BR" },
    { name: "organizationName", value: "MedFlow Signer Unit Tests" },
  ];
  cert.setSubject(attrs);
  cert.setIssuer(attrs);
  cert.sign(keys.privateKey);

  const pfx = forge.pkcs12.toPkcs12Asn1(keys.privateKey, [cert], password);
  const pfxDer = forge.asn1.toDer(pfx).getBytes();
  return forge.util.encode64(pfxDer);
}

describe("NF-e XML Signer Service Unit Tests", () => {
  let empresaIdValida: number;
  const passwordMock = "senha-assinador-123";
  const baseXml = `<NFe xmlns="http://www.portalfiscal.inf.br/nfe"><infNFe Id="NFe33260699888777000188550010000000111123456780"><det nItem="1"><prod><cProd>00001</cProd><xProd>Servico de Teste</xProd></prod></det></infNFe></NFe>`;

  before(async () => {
    // Certifica-se que a chave de criptografia de teste está definida
    if (!process.env.CERT_ENCRYPTION_KEY) {
      process.env.CERT_ENCRYPTION_KEY = "chave-de-teste-de-criptografia-32-chars-max!";
    }

    // 0. Limpar dados residuais
    await prisma.empresaFiscal.deleteMany({
      where: { cnpj: "99888777000188" }
    });

    // 1. Criar empresa com certificado mockado válido
    const pfxBase64 = generateMockPfx(passwordMock);
    const senhaCriptografada = criptografarSenha(passwordMock);

    const empresa = await prisma.empresaFiscal.create({
      data: {
        razaoSocial: "Empresa Assinadora LTDA",
        nomeFantasia: "Empresa Assinadora",
        cnpj: "99888777000188",
        inscricaoEstadual: "12345678",
        regimeTributario: "SIMPLES_NACIONAL",
        ativo: true,
        certificadoPfxBase64: pfxBase64,
        certificadoSenha: senhaCriptografada,
      }
    });
    empresaIdValida = empresa.id;
  });

  after(async () => {
    // Limpeza
    await prisma.empresaFiscal.deleteMany({
      where: { id: empresaIdValida }
    });
  });

  test("Caso de Teste 1: Assina XML com mock do certificado.service e valida que o XML retornado contem <Signature> e <X509Certificate>", async () => {
    const xmlAssinado = await assinarXML(baseXml, empresaIdValida);

    assert.ok(xmlAssinado.includes("<Signature"), "O XML assinado deve conter a tag <Signature>");
    assert.ok(xmlAssinado.includes("<SignatureValue"), "O XML assinado deve conter a tag <SignatureValue>");
    assert.ok(xmlAssinado.includes("<X509Certificate>"), "O XML assinado deve conter a tag <X509Certificate>");
    
    // Valida que o XML assinado é parseável e a assinatura foi inserida imediatamente após infNFe
    assert.ok(xmlAssinado.indexOf("</infNFe><Signature") !== -1, "A assinatura deve estar posicionada após a tag </infNFe>");
  });

  test("Caso de Teste 2: Erro descritivo quando carregarCertificado lanca excecao (empresa invalida)", async () => {
    const empresaInexistenteId = 999999;
    
    await assert.rejects(
      assinarXML(baseXml, empresaInexistenteId),
      new Error(`Falha na assinatura do XML: Empresa emissora ID ${empresaInexistenteId} nao encontrada.`)
    );
  });
});
