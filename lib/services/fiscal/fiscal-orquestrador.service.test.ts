import { test, describe, before, after, mock } from "node:test";
import assert from "node:assert";
import { prisma } from "@/lib/prisma";
import { FiscalOrquestradorService, fiscalServices } from "./fiscal-orquestrador.service";
import { StatusDocumentoFiscal, TipoDocumentoFiscal, TipoPedido } from "@prisma/client";

describe("Fiscal Orchestrator Service Unit Tests", () => {
  let empresaId: number;
  let clienteId: number;
  let pedidoId: number;

  before(async () => {
    // 0. Limpeza previa para evitar duplicidades
    await prisma.documentoFiscal.deleteMany({
      where: { numero: { in: ["MOCK-ORQ-1", "MOCK-ORQ-2", "MOCK-ORQ-3", "MOCK-ORQ-4"] } }
    });
    await prisma.pedidoVenda.deleteMany({
      where: { numero: "PED-ORQ-TEST" }
    });
    await prisma.cliente.deleteMany({
      where: { cnpjCpf: "99888111000199" }
    });
    await prisma.empresaFiscal.deleteMany({
      where: { cnpj: "99888111000299" }
    });

    // 1. Criar dados base para teste
    const empresa = await prisma.empresaFiscal.create({
      data: {
        razaoSocial: "Orquestrador SA",
        cnpj: "99888111000299",
        inscricaoEstadual: "123",
        regimeTributario: "SIMPLES_NACIONAL",
        ativo: true
      }
    });
    empresaId = empresa.id;

    const cliente = await prisma.cliente.create({
      data: {
        razaoSocial: "Cliente Orq",
        cnpjCpf: "99888111000199",
        ativo: true
      }
    });
    clienteId = cliente.id;

    const pedido = await prisma.pedidoVenda.create({
      data: {
        numero: "PED-ORQ-TEST",
        clienteId,
        tipoPedido: TipoPedido.PEDIDO_NORMAL,
        empresaFiscalId: empresaId,
        valorTotal: 100
      }
    });
    pedidoId = pedido.id;
  });

  after(async () => {
    // Limpeza final de registros de teste
    await prisma.documentoFiscal.deleteMany({
      where: { numero: { in: ["MOCK-ORQ-1", "MOCK-ORQ-2", "MOCK-ORQ-3", "MOCK-ORQ-4"] } }
    });
    await prisma.pedidoVenda.deleteMany({
      where: { id: pedidoId }
    });
    await prisma.cliente.deleteMany({
      where: { id: clienteId }
    });
    await prisma.empresaFiscal.deleteMany({
      where: { id: empresaId }
    });
    mock.restoreAll();
  });

  test("Caso 1: NF-e autorizada -> status AUTORIZADA, chaveAcesso e danfePdfBase64 preenchidos", async () => {
    mock.restoreAll();

    const doc = await prisma.documentoFiscal.create({
      data: {
        numero: "MOCK-ORQ-1",
        tipo: TipoDocumentoFiscal.NFE_SAIDA,
        status: StatusDocumentoFiscal.PENDENTE,
        empresaFiscalId: empresaId,
        clienteId,
        pedidoVendaId: pedidoId
      }
    });

    mock.method(fiscalServices, "buildNFeXml", async () => "<xml/>");
    mock.method(fiscalServices, "assinarXML", async () => "<signedXml/>");
    mock.method(fiscalServices, "enviarNFe", async () => ({
      autorizada: true,
      xmlAutorizado: "<xmlAutorizado/>",
      chaveAcesso: "ch-nfe-1",
      protocolo: "prot-nfe-1"
    }));
    mock.method(fiscalServices, "gerarDanfe", async () => "danfe-base64");

    const res = await FiscalOrquestradorService.emitir(doc.id);
    assert.strictEqual(res.autorizada, true);

    const updated = await prisma.documentoFiscal.findUnique({ where: { id: doc.id } });
    assert.ok(updated);
    assert.strictEqual(updated.status, StatusDocumentoFiscal.AUTORIZADA);
    assert.strictEqual(updated.chaveAcesso, "ch-nfe-1");
    assert.strictEqual(updated.protocolo, "prot-nfe-1");
    assert.strictEqual(updated.danfePdfBase64, "danfe-base64");
    assert.strictEqual(
      Buffer.from(updated.xmlAutorizadoBase64!, "base64").toString(),
      "<xmlAutorizado/>"
    );
    assert.ok(updated.dataAutorizacao);
  });

  test("Caso 2: NF-e rejeitada -> status REJEITADA, motivoRejeicao preenchido", async () => {
    mock.restoreAll();

    const doc = await prisma.documentoFiscal.create({
      data: {
        numero: "MOCK-ORQ-2",
        tipo: TipoDocumentoFiscal.NFE_SAIDA,
        status: StatusDocumentoFiscal.PENDENTE,
        empresaFiscalId: empresaId,
        clienteId,
        pedidoVendaId: pedidoId
      }
    });

    mock.method(fiscalServices, "buildNFeXml", async () => "<xml/>");
    mock.method(fiscalServices, "assinarXML", async () => "<signedXml/>");
    mock.method(fiscalServices, "enviarNFe", async () => ({
      autorizada: false,
      codigoRejeicao: "204",
      mensagemRejeicao: "Duplicidade de NF-e"
    }));

    const res = await FiscalOrquestradorService.emitir(doc.id);
    assert.strictEqual(res.autorizada, false);

    const updated = await prisma.documentoFiscal.findUnique({ where: { id: doc.id } });
    assert.ok(updated);
    assert.strictEqual(updated.status, StatusDocumentoFiscal.REJEITADA);
    assert.strictEqual(updated.codigoRejeicao, "204");
    assert.strictEqual(updated.mensagemRejeicao, "Duplicidade de NF-e");
    assert.strictEqual(updated.motivoRejeicao, "Duplicidade de NF-e");
  });

  test("Caso 3: NFS-e autorizada -> status AUTORIZADA, chaveAcesso preenchido", async () => {
    mock.restoreAll();

    const doc = await prisma.documentoFiscal.create({
      data: {
        numero: "MOCK-ORQ-3",
        tipo: TipoDocumentoFiscal.NFSE,
        status: StatusDocumentoFiscal.PENDENTE,
        empresaFiscalId: empresaId,
        clienteId,
        pedidoVendaId: pedidoId
      }
    });

    mock.method(fiscalServices, "enviarNFSe", async () => ({
      autorizada: true,
      chaveAcesso: "ch-nfse-3",
      xmlAutorizado: "{\"dps\":\"ok\"}"
    }));

    const res = await FiscalOrquestradorService.emitir(doc.id);
    assert.strictEqual(res.autorizada, true);

    const updated = await prisma.documentoFiscal.findUnique({ where: { id: doc.id } });
    assert.ok(updated);
    assert.strictEqual(updated.status, StatusDocumentoFiscal.AUTORIZADA);
    assert.strictEqual(updated.chaveAcesso, "ch-nfse-3");
    assert.strictEqual(
      Buffer.from(updated.xmlAutorizadoBase64!, "base64").toString(),
      "{\"dps\":\"ok\"}"
    );
    assert.ok(updated.dataAutorizacao);
  });

  test("Caso 4: Erro inesperado no builder -> status REJEITADA, erro relançado", async () => {
    mock.restoreAll();

    const doc = await prisma.documentoFiscal.create({
      data: {
        numero: "MOCK-ORQ-4",
        tipo: TipoDocumentoFiscal.NFE_SAIDA,
        status: StatusDocumentoFiscal.PENDENTE,
        empresaFiscalId: empresaId,
        clienteId,
        pedidoVendaId: pedidoId
      }
    });

    mock.method(fiscalServices, "buildNFeXml", async () => {
      throw new Error("Erro inesperado de teste");
    });

    await assert.rejects(
      FiscalOrquestradorService.emitir(doc.id),
      /Erro inesperado de teste/
    );

    const updated = await prisma.documentoFiscal.findUnique({ where: { id: doc.id } });
    assert.ok(updated);
    assert.strictEqual(updated.status, StatusDocumentoFiscal.REJEITADA);
    assert.strictEqual(updated.motivoRejeicao, "Erro inesperado de teste");
  });
});
