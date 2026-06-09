import { test, describe, before, after, mock } from "node:test";
import assert from "node:assert";
import { prisma } from "@/lib/prisma";
import { enviarEmailFiscal } from "./nfe-email.service";
import * as emailProvider from "../../email/email-provider.service";
import { StatusDocumentoFiscal, TipoDocumentoFiscal, TipoPedido } from "@prisma/client";

describe("NF-e Email Service Unit Tests", () => {
  let clienteIdValido: number;
  let clienteIdSemEmail: number;
  let empresaId: number;
  let pedidoIdValido: number;
  let pedidoIdSemEmail: number;
  let docIdAutorizada: number;
  let docIdPendente: number;
  let docIdSemEmail: number;

  const mockXmlBase64 = Buffer.from("<xml>mock-nfe-data</xml>").toString("base64");

  before(async () => {
    // 0. Limpar dados residuais
    await prisma.documentoFiscal.deleteMany({
      where: {
        numero: { in: ["MOCK-999-AUT", "MOCK-999-PEN", "MOCK-999-SEM"] },
      },
    });
    await prisma.pedidoVenda.deleteMany({
      where: {
        numero: { in: ["PED-TESTE-AUT", "PED-TESTE-SEM"] },
      },
    });
    await prisma.cliente.deleteMany({
      where: {
        cnpjCpf: { in: ["99777555000199", "99777555000299"] },
      },
    });
    await prisma.empresaFiscal.deleteMany({
      where: {
        cnpj: "99777555000399",
      },
    });

    if (!process.env.CERT_ENCRYPTION_KEY) {
      process.env.CERT_ENCRYPTION_KEY = "chave-de-teste-de-criptografia-32-chars-max!";
    }

    // 1. Criar empresa fiscal
    const empresa = await prisma.empresaFiscal.create({
      data: {
        razaoSocial: "Empresa Emissora NF-e LTDA",
        nomeFantasia: "Pulse Emissora",
        cnpj: "99777555000399",
        inscricaoEstadual: "12345678",
        regimeTributario: "SIMPLES_NACIONAL",
        ativo: true,
        emailApiKey: "mock-key",
        emailRemetente: "nfe@pulse.com.br",
        emailAtivo: true,
      },
    });
    empresaId = empresa.id;

    // 2. Criar clientes
    const clienteValido = await prisma.cliente.create({
      data: {
        razaoSocial: "Cliente Com Email LTDA",
        cnpjCpf: "99777555000199",
        email: "cliente-com-email@teste.com",
        ativo: true,
      },
    });
    clienteIdValido = clienteValido.id;

    const clienteSemEmail = await prisma.cliente.create({
      data: {
        razaoSocial: "Cliente Sem Email LTDA",
        cnpjCpf: "99777555000299",
        ativo: true,
      },
    });
    clienteIdSemEmail = clienteSemEmail.id;

    // 3. Criar pedidos
    const pedidoValido = await prisma.pedidoVenda.create({
      data: {
        numero: "PED-TESTE-AUT",
        clienteId: clienteIdValido,
        tipoPedido: TipoPedido.PEDIDO_NORMAL,
        empresaFiscalId: empresaId,
        valorTotal: 100,
      },
    });
    pedidoIdValido = pedidoValido.id;

    const pedidoSemEmail = await prisma.pedidoVenda.create({
      data: {
        numero: "PED-TESTE-SEM",
        clienteId: clienteIdSemEmail,
        tipoPedido: TipoPedido.PEDIDO_NORMAL,
        empresaFiscalId: empresaId,
        valorTotal: 100,
      },
    });
    pedidoIdSemEmail = pedidoSemEmail.id;

    // 4. Criar documentos fiscais
    const docAutorizada = await prisma.documentoFiscal.create({
      data: {
        numero: "MOCK-999-AUT",
        tipo: TipoDocumentoFiscal.NFE_SAIDA,
        status: StatusDocumentoFiscal.AUTORIZADA,
        xmlAutorizadoBase64: mockXmlBase64,
        empresaFiscalId: empresaId,
        clienteId: clienteIdValido,
        pedidoVendaId: pedidoIdValido,
      },
    });
    docIdAutorizada = docAutorizada.id;

    const docPendente = await prisma.documentoFiscal.create({
      data: {
        numero: "MOCK-999-PEN",
        tipo: TipoDocumentoFiscal.NFE_SAIDA,
        status: StatusDocumentoFiscal.PENDENTE,
        xmlAutorizadoBase64: mockXmlBase64,
        empresaFiscalId: empresaId,
        clienteId: clienteIdValido,
        pedidoVendaId: pedidoIdValido,
      },
    });
    docIdPendente = docPendente.id;

    const docSemEmail = await prisma.documentoFiscal.create({
      data: {
        numero: "MOCK-999-SEM",
        tipo: TipoDocumentoFiscal.NFE_SAIDA,
        status: StatusDocumentoFiscal.AUTORIZADA,
        xmlAutorizadoBase64: mockXmlBase64,
        empresaFiscalId: empresaId,
        clienteId: clienteIdSemEmail,
        pedidoVendaId: pedidoIdSemEmail,
      },
    });
    docIdSemEmail = docSemEmail.id;
  });

  after(async () => {
    // Limpeza final
    await prisma.documentoFiscal.deleteMany({
      where: {
        id: { in: [docIdAutorizada, docIdPendente, docIdSemEmail] },
      },
    });
    await prisma.pedidoVenda.deleteMany({
      where: {
        id: { in: [pedidoIdValido, pedidoIdSemEmail] },
      },
    });
    await prisma.cliente.deleteMany({
      where: {
        id: { in: [clienteIdValido, clienteIdSemEmail] },
      },
    });
    await prisma.empresaFiscal.deleteMany({
      where: { id: empresaId },
    });

    mock.restoreAll();
  });

  test("Caso de Teste 1: Envio de e-mail fiscal bem-sucedido com XML anexado (sem PDF)", async () => {
    mock.restoreAll();

    const mockEnviarEmail = mock.fn(async (params: any) => {
      assert.strictEqual(params.empresaEmissoraId, empresaId);
      assert.strictEqual(params.destinatario, "cliente-com-email@teste.com");
      assert.ok(params.assunto.includes("Nota Fiscal Eletronica"));
      assert.ok(params.html.includes(`/api/fiscal/${docIdAutorizada}/danfe`));
      
      // Valida anexo: deve ter exatamente 1 anexo (XML), e o PDF do DANFe NÃO pode estar anexado
      assert.strictEqual(params.anexos?.length, 1, "Deve possuir apenas o XML anexado");
      assert.strictEqual(params.anexos[0].filename, `NFe-MOCK-999-AUT.xml`);
      assert.strictEqual(params.anexos[0].content.toString(), "<xml>mock-nfe-data</xml>");
      assert.strictEqual(params.pedidoVendaId, pedidoIdValido);
      assert.strictEqual(params.documentoFiscalId, docIdAutorizada);
    });

    mock.method(emailProvider.EmailProvider, "enviarEmail", mockEnviarEmail);

    await enviarEmailFiscal(docIdAutorizada);

    assert.strictEqual(mockEnviarEmail.mock.callCount(), 1);
  });

  test("Caso de Teste 2: Documento não AUTORIZADA -> erro antes de chamar o provider", async () => {
    mock.restoreAll();

    const mockEnviarEmail = mock.fn(async () => {});
    mock.method(emailProvider.EmailProvider, "enviarEmail", mockEnviarEmail);

    await assert.rejects(
      enviarEmailFiscal(docIdPendente),
      new Error(`Documento fiscal ID ${docIdPendente} nao esta com status AUTORIZADA.`)
    );

    assert.strictEqual(mockEnviarEmail.mock.callCount(), 0);
  });

  test("Caso de Teste 3: Cliente sem e-mail -> erro antes de chamar o provider", async () => {
    mock.restoreAll();

    const mockEnviarEmail = mock.fn(async () => {});
    mock.method(emailProvider.EmailProvider, "enviarEmail", mockEnviarEmail);

    await assert.rejects(
      enviarEmailFiscal(docIdSemEmail),
      new Error(`Cliente Cliente Sem Email LTDA nao possui e-mail cadastrado.`)
    );

    assert.strictEqual(mockEnviarEmail.mock.callCount(), 0);
  });

  test("Caso de Teste 4: Provider lança exceção -> erro propagado", async () => {
    mock.restoreAll();

    const mockEnviarEmail = mock.fn(async () => {
      throw new Error("Erro de conexao com Resend");
    });
    mock.method(emailProvider.EmailProvider, "enviarEmail", mockEnviarEmail);

    await assert.rejects(
      enviarEmailFiscal(docIdAutorizada),
      new Error("Erro de conexao com Resend")
    );

    assert.strictEqual(mockEnviarEmail.mock.callCount(), 1);
  });
});
