import { test, describe, before, after } from "node:test";
import assert from "node:assert";
import { prisma } from "@/lib/prisma";
import forge from "node-forge";
import {
  criptografarSenha,
  descriptografarSenha,
  carregarCertificado,
  verificarValidade,
} from "./certificado.service";

/**
 * Auxiliar para gerar dinamicamente um arquivo PFX (.pfx) em formato base64 para uso nos testes unitários.
 * Isso nos permite gerar certificados com validades distintas (ex: vencendo em 20 dias, 60 dias, ou expirados)
 * sem precisar embutir arquivos estáticos no repositório.
 */
function generateMockPfx(password: string, daysValid: number): string {
  // Gera um par de chaves RSA de 1024 bits (rápido e suficiente para mock)
  const keys = forge.pki.rsa.generateKeyPair(1024);

  // Cria o certificado
  const cert = forge.pki.createCertificate();
  cert.publicKey = keys.publicKey;
  cert.serialNumber = "012345";
  
  cert.validity.notBefore = new Date();
  cert.validity.notAfter = new Date();
  
  // Ajusta a validade com base nos dias informados (pode ser negativo para simular expiração)
  cert.validity.notAfter.setDate(cert.validity.notBefore.getDate() + daysValid);

  const attrs = [
    { name: "commonName", value: "Empresa de Teste Fiscal LTDA" },
    { name: "countryName", value: "BR" },
    { name: "organizationName", value: "MedFlow ERP Testes" },
  ];
  cert.setSubject(attrs);
  cert.setIssuer(attrs);

  // Assina o certificado digital usando sua própria chave privada
  cert.sign(keys.privateKey);

  // Empacota em formato PKCS#12
  const pfx = forge.pkcs12.toPkcs12Asn1(keys.privateKey, [cert], password);
  
  // Transforma em binário DER e codifica em Base64
  const pfxDer = forge.asn1.toDer(pfx).getBytes();
  return forge.util.encode64(pfxDer);
}

describe("Serviço de Certificado Unit Tests (Tarefa 1.5)", () => {
  let empresaIdValido: number;
  let empresaIdSemCertificado: number;
  const passwordMock = "senha-secreta-123";

  before(async () => {
    // Definir uma chave temporária para criptografia se não existir no ambiente de testes
    if (!process.env.CERT_ENCRYPTION_KEY) {
      process.env.CERT_ENCRYPTION_KEY = "chave-de-teste-de-criptografia-32-chars-max!";
    }

    // 0. Limpar qualquer resíduo
    await prisma.empresaFiscal.deleteMany({
      where: {
        cnpj: { in: ["99888777000100", "99888777000199"] }
      }
    });

    // 1. Criar Empresa Fiscal com Certificado Inicial Válido (para teste 1)
    const pfxBase64 = generateMockPfx(passwordMock, 60); // 60 dias de validade
    const senhaCriptografada = criptografarSenha(passwordMock);

    const empresaValida = await prisma.empresaFiscal.create({
      data: {
        razaoSocial: "Empresa Com Certificado Válido LTDA",
        nomeFantasia: "Empresa Válida",
        cnpj: "99888777000100",
        inscricaoEstadual: "12345678",
        regimeTributario: "SIMPLES_NACIONAL",
        ativo: true,
        certificadoPfxBase64: pfxBase64,
        certificadoSenha: senhaCriptografada,
      }
    });
    empresaIdValido = empresaValida.id;

    // 2. Criar Empresa Fiscal sem Certificado
    const empresaSemCert = await prisma.empresaFiscal.create({
      data: {
        razaoSocial: "Empresa Sem Certificado LTDA",
        cnpj: "99888777000199",
        inscricaoEstadual: "87654321",
        regimeTributario: "SIMPLES_NACIONAL",
        ativo: true,
      }
    });
    empresaIdSemCertificado = empresaSemCert.id;
  });

  after(async () => {
    // Limpeza final do banco
    await prisma.empresaFiscal.deleteMany({
      where: {
        id: { in: [empresaIdValido, empresaIdSemCertificado] }
      }
    });
  });

  test("Caso de Teste 1: Carregamento bem-sucedido de um .pfx mockado válido", async () => {
    const certData = await carregarCertificado(empresaIdValido);
    
    assert.ok(certData.privateKeyPem.startsWith("-----BEGIN RSA PRIVATE KEY-----"));
    assert.ok(certData.certificatePem.startsWith("-----BEGIN CERTIFICATE-----"));
    assert.ok(certData.validity instanceof Date);
    
    const agora = new Date();
    assert.ok(certData.validity > agora, "A validade deve ser maior que a data atual");
  });

  test("Caso de Teste 2: Erro descritivo quando empresa não tem certificado cadastrado", async () => {
    await assert.rejects(
      carregarCertificado(empresaIdSemCertificado),
      new Error(`Empresa ID ${empresaIdSemCertificado} nao possui certificado digital cadastrado.`)
    );
  });

  test("Caso de Teste 3: verificarValidade retorna alertar: true para certificado que vence em 20 dias", async () => {
    // Sobrescrever o certificado da empresa com validade de 20 dias
    const pfx20Dias = generateMockPfx(passwordMock, 20);
    const senhaCriptografada = criptografarSenha(passwordMock);

    await prisma.empresaFiscal.update({
      where: { id: empresaIdValido },
      data: {
        certificadoPfxBase64: pfx20Dias,
        certificadoSenha: senhaCriptografada
      }
    });

    const status = await verificarValidade(empresaIdValido);
    assert.strictEqual(status.valido, true);
    assert.strictEqual(status.alertar, true);
  });

  test("Caso de Teste 4: verificarValidade retorna alertar: false para certificado que vence em 60 dias", async () => {
    // Sobrescrever o certificado da empresa com validade de 60 dias
    const pfx60Dias = generateMockPfx(passwordMock, 60);
    const senhaCriptografada = criptografarSenha(passwordMock);

    await prisma.empresaFiscal.update({
      where: { id: empresaIdValido },
      data: {
        certificadoPfxBase64: pfx60Dias,
        certificadoSenha: senhaCriptografada
      }
    });

    const status = await verificarValidade(empresaIdValido);
    assert.strictEqual(status.valido, true);
    assert.strictEqual(status.alertar, false);
  });

  test("Caso de Teste 5: verificarValidade retorna valido: false e alertar: true para certificado vencido (-1 dia)", async () => {
    // Sobrescrever o certificado da empresa com validade de -1 dia (expirado)
    const pfxExpirado = generateMockPfx(passwordMock, -1);
    const senhaCriptografada = criptografarSenha(passwordMock);

    await prisma.empresaFiscal.update({
      where: { id: empresaIdValido },
      data: {
        certificadoPfxBase64: pfxExpirado,
        certificadoSenha: senhaCriptografada
      }
    });

    const status = await verificarValidade(empresaIdValido);
    assert.strictEqual(status.valido, false);
    assert.strictEqual(status.alertar, true);
  });

  test("Caso de Teste 6: criptografarSenha -> descriptografarSenha round-trip (o que entrou deve sair igual)", () => {
    const textoOriginal = "SenhaUltraSecreta123!@#";
    const textoCriptografado = criptografarSenha(textoOriginal);
    
    // Confirma que não é igual ao original
    assert.notStrictEqual(textoOriginal, textoCriptografado);
    
    // Confirma que o IV e ciphertext estão separados por dois pontos e possuem caracteres hexadecimais
    const parts = textoCriptografado.split(":");
    assert.strictEqual(parts.length, 2, "Criptografia deve retornar no formato iv:encryptedText");
    assert.match(parts[0], /^[0-9a-fA-F]+$/, "O IV deve ser uma string em hexadecimal");
    assert.match(parts[1], /^[0-9a-fA-F]+$/, "O texto criptografado deve ser uma string em hexadecimal");

    const textoDescriptografado = descriptografarSenha(textoCriptografado);
    assert.strictEqual(textoOriginal, textoDescriptografado, "O texto decifrado deve ser idêntico ao original");
  });
});
