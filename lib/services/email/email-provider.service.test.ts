import { test, describe, before, after, mock } from "node:test";
import assert from "node:assert";
import { prisma } from "@/lib/prisma";
import { Resend } from "resend";
import {
  criptografarApiKey,
  descriptografarApiKey,
  enviarEmail,
} from "./email-provider.service";
import { StatusEmail } from "@prisma/client";

describe("Email Provider Service Unit Tests", () => {
  let empresaIdValida: number;
  let empresaIdDesativada: number;
  const mockApiKey = "re_1234567890abcdef";
  const mockRemetente = "MedFlow Test <notificacao@medflow.com.br>";

  before(async () => {
    // 0. Limpar resíduos de testes anteriores
    await prisma.empresaFiscal.deleteMany({
      where: {
        cnpj: { in: ["99777555000100", "99777555000111"] },
      },
    });

    if (!process.env.CERT_ENCRYPTION_KEY) {
      process.env.CERT_ENCRYPTION_KEY = "chave-de-teste-de-criptografia-32-chars-max!";
    }

    const keyCriptografada = criptografarApiKey(mockApiKey);

    // 1. Criar empresa fiscal ativa para envio de email
    const empresaAtiva = await prisma.empresaFiscal.create({
      data: {
        razaoSocial: "Empresa Email Ativo LTDA",
        nomeFantasia: "DAC Ativa",
        cnpj: "99777555000100",
        inscricaoEstadual: "12345678",
        regimeTributario: "SIMPLES_NACIONAL",
        ativo: true,
        emailApiKey: keyCriptografada,
        emailRemetente: mockRemetente,
        emailAtivo: true,
      },
    });
    empresaIdValida = empresaAtiva.id;

    // 2. Criar empresa fiscal com email desativado
    const empresaDesativa = await prisma.empresaFiscal.create({
      data: {
        razaoSocial: "Empresa Email Inativo LTDA",
        nomeFantasia: "Pulse Inativa",
        cnpj: "99777555000111",
        inscricaoEstadual: "87654321",
        regimeTributario: "SIMPLES_NACIONAL",
        ativo: true,
        emailApiKey: keyCriptografada,
        emailRemetente: mockRemetente,
        emailAtivo: false,
      },
    });
    empresaIdDesativada = empresaDesativa.id;
  });

  after(async () => {
    // Limpeza final
    await prisma.logEmail.deleteMany({
      where: {
        empresaFiscalId: { in: [empresaIdValida, empresaIdDesativada] },
      },
    });

    await prisma.empresaFiscal.deleteMany({
      where: {
        id: { in: [empresaIdValida, empresaIdDesativada] },
      },
    });

    mock.restoreAll();
  });

  test("Caso de Teste 1: criptografarApiKey e descriptografarApiKey round-trip", () => {
    const original = "re_my_secret_key_12345";
    const encrypted = criptografarApiKey(original);
    assert.notStrictEqual(original, encrypted);

    const decrypted = descriptografarApiKey(encrypted);
    assert.strictEqual(original, decrypted);
  });

  test("Caso de Teste 2: Envio com sucesso -> LogEmail criado com status ENVIADO", async () => {
    mock.restoreAll();

    // Mock do método send do Resend
    const tempResend = new Resend("temp-key");
    const EmailsPrototype = Object.getPrototypeOf(tempResend.emails);

    const mockSend = mock.fn(async (payload: any) => {
      assert.strictEqual(payload.from, mockRemetente);
      assert.strictEqual(payload.to[0], "cliente@teste.com");
      assert.strictEqual(payload.subject, "Assunto de Teste");
      assert.strictEqual(payload.html, "<p>Teste</p>");
      return { data: { id: "mock-id-123" }, error: null };
    });

    mock.method(EmailsPrototype, "send", mockSend);

    await enviarEmail({
      empresaEmissoraId: empresaIdValida,
      destinatario: "cliente@teste.com",
      assunto: "Assunto de Teste",
      html: "<p>Teste</p>",
    });

    assert.strictEqual(mockSend.mock.callCount(), 1);

    // Verificar se o LogEmail foi gravado com status ENVIADO
    const logs = await prisma.logEmail.findMany({
      where: { empresaFiscalId: empresaIdValida },
      orderBy: { createdAt: "desc" },
    });

    assert.strictEqual(logs.length, 1);
    assert.strictEqual(logs[0].status, StatusEmail.ENVIADO);
    assert.strictEqual(logs[0].destinatario, "cliente@teste.com");
    assert.strictEqual(logs[0].remetente, mockRemetente);
    assert.strictEqual(logs[0].assunto, "Assunto de Teste");
    assert.strictEqual(logs[0].erroMensagem, null);
  });

  test("Caso de Teste 3: emailAtivo === false -> lança erro antes de chamar o Resend", async () => {
    mock.restoreAll();

    const tempResend = new Resend("temp-key");
    const EmailsPrototype = Object.getPrototypeOf(tempResend.emails);
    const mockSend = mock.fn(async () => {
      return { data: null, error: null };
    });
    mock.method(EmailsPrototype, "send", mockSend);

    await assert.rejects(
      enviarEmail({
        empresaEmissoraId: empresaIdDesativada,
        destinatario: "cliente@teste.com",
        assunto: "Assunto de Teste",
        html: "<p>Teste</p>",
      }),
      new Error(`Servico de e-mail desativado para a empresa ID ${empresaIdDesativada}.`)
    );

    assert.strictEqual(mockSend.mock.callCount(), 0);

    // Nao deve ter criado log
    const logs = await prisma.logEmail.findMany({
      where: { empresaFiscalId: empresaIdDesativada },
    });
    assert.strictEqual(logs.length, 0);
  });

  test("Caso de Teste 4: Resend retorna erro -> LogEmail atualizado para FALHOU e erro relançado", async () => {
    mock.restoreAll();

    const tempResend = new Resend("temp-key");
    const EmailsPrototype = Object.getPrototypeOf(tempResend.emails);

    const mockSend = mock.fn(async () => {
      return {
        data: null,
        error: {
          name: "validation_error",
          message: "API key is invalid",
        },
      };
    });

    mock.method(EmailsPrototype, "send", mockSend);

    await assert.rejects(
      enviarEmail({
        empresaEmissoraId: empresaIdValida,
        destinatario: "cliente@falha.com",
        assunto: "Teste Falha",
        html: "<p>Teste Falha</p>",
      }),
      /API key is invalid/
    );

    assert.strictEqual(mockSend.mock.callCount(), 1);

    // Verificar se o LogEmail foi gravado com status FALHOU
    const logs = await prisma.logEmail.findMany({
      where: {
        empresaFiscalId: empresaIdValida,
        destinatario: "cliente@falha.com",
      },
      orderBy: { createdAt: "desc" },
    });

    assert.strictEqual(logs.length, 1);
    assert.strictEqual(logs[0].status, StatusEmail.FALHOU);
    assert.strictEqual(logs[0].erroMensagem, "API key is invalid");
  });
});
