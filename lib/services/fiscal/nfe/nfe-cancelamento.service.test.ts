import { test, describe, mock, before, beforeEach, afterEach } from "node:test";
import assert from "node:assert";
import { prisma } from "@/lib/prisma";
import { cancelarNFe, deps } from "./nfe-cancelamento.service";
import { StatusDocumentoFiscal, StatusPedido, TipoDocumentoFiscal } from "@prisma/client";

// Definição da resposta SOAP de sucesso da SEFAZ
const XML_RESPOSTA_SUCESSO = `
<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope">
  <soap:Body>
    <nfeRecepcaoEventoResult xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/NfeRecepcaoEvento4">
      <retEnvEvento versao="1.00" xmlns="http://www.portalfiscal.inf.br/nfe">
        <cStat>128</cStat>
        <xMotivo>Lote de Evento Processado</xMotivo>
        <retEvento>
          <infEvento>
            <cStat>135</cStat>
            <xMotivo>Evento registrado e vinculado a NF-e</xMotivo>
          </infEvento>
        </retEvento>
      </retEnvEvento>
    </nfeRecepcaoEventoResult>
  </soap:Body>
</soap:Envelope>
`;

// Definição da resposta SOAP de rejeição da SEFAZ
const XML_RESPOSTA_REJEICAO = `
<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope">
  <soap:Body>
    <nfeRecepcaoEventoResult xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/NfeRecepcaoEvento4">
      <retEnvEvento versao="1.00" xmlns="http://www.portalfiscal.inf.br/nfe">
        <cStat>128</cStat>
        <xMotivo>Lote de Evento Processado</xMotivo>
        <retEvento>
          <infEvento>
            <cStat>228</cStat>
            <xMotivo>Rejeição: Schema XML inválido</xMotivo>
          </infEvento>
        </retEvento>
      </retEnvEvento>
    </nfeRecepcaoEventoResult>
  </soap:Body>
</soap:Envelope>
`;

describe("Serviço de Cancelamento de NF-e - Testes Unitários", () => {
  let originalFindUniqueDoc: any;
  let originalFindUniqueUser: any;
  let originalTransaction: any;

  before(() => {
    // Salvar métodos originais do Prisma
    originalFindUniqueDoc = (prisma.documentoFiscal as any).findUnique;
    originalFindUniqueUser = (prisma.usuario as any).findUnique;
    originalTransaction = (prisma as any).$transaction;
  });

  beforeEach(() => {
    // Mock global do assinarEventoXML no deps do serviço
    mock.method(deps, "assinarEventoXML", async () => "<xml>evento-assinado</xml>");
    (prisma.usuario as any).findUnique = async () => ({ nome: "Financeiro Admin" }) as any;
  });

  afterEach(() => {
    // Restaurar stubs do Prisma
    (prisma.documentoFiscal as any).findUnique = originalFindUniqueDoc;
    (prisma.usuario as any).findUnique = originalFindUniqueUser;
    (prisma as any).$transaction = originalTransaction;

    mock.reset();
  });

  test("Teste 1a: Cancelamento válido, pedido em FATURADO -> libera reserva e reverte para AGUARDANDO_FATURAMENTO", async () => {
    // 1. Mock do Documento Fiscal no banco
    const mockDoc = {
      id: 1,
      tipo: TipoDocumentoFiscal.NFE_SAIDA,
      status: StatusDocumentoFiscal.AUTORIZADA,
      chaveAcesso: "33260699888777000188550010000000111123456780",
      protocolo: "133123456789012",
      dataAutorizacao: new Date(), // Agora
      nSeqEventoCancelamento: 1,
      empresaFiscalId: 10,
      empresaFiscal: {
        id: 10,
        cnpj: "99888777000188",
        ambienteSEFAZ: "homologacao",
      },
      pedidoVendaId: 999,
      pedidoVenda: {
        id: 999,
        numero: "PED-999",
        status: StatusPedido.FATURADO,
        vendedor: { nome: "Vendedor Teste" },
        itens: [
          { produtoId: 101, quantidade: 2 },
        ],
      },
    };

    (prisma.documentoFiscal as any).findUnique = async () => mockDoc as any;
    (prisma.usuario as any).findUnique = async () => ({ nome: "Financeiro Admin" }) as any;

    // Mock do fetch no deps para simular retorno de sucesso da SEFAZ
    mock.method(deps, "fetch", async () => {
      return {
        ok: true,
        text: async () => XML_RESPOSTA_SUCESSO,
      } as any;
    });

    // Mocks do Prisma no $transaction
    const mockTx: any = {
      documentoFiscal: {
        update: mock.fn(async () => ({})),
      },
      pedidoVenda: {
        update: mock.fn(async () => ({})),
      },
      conta: {
        updateMany: mock.fn(async () => ({})),
      },
      separacao: {
        findUnique: mock.fn(async () => null), // Sem separação
      },
      estoqueAtual: {
        findFirst: mock.fn(async () => ({ id: 50, quantidadeDisponivel: 10, quantidadeReservada: 5 })),
        update: mock.fn(async () => ({})),
      },
      movimentacaoEstoque: {
        findFirst: mock.fn(async () => ({ loteId: 202 })), // Fallback de lote
        create: mock.fn(async () => ({})),
      },
      historicoPedido: {
        create: mock.fn(async () => ({})),
      },
    };

    (prisma as any).$transaction = async (cb: any) => {
      return cb(mockTx);
    };

    // Executa o cancelamento
    await cancelarNFe(1, "Motivo válido com mais de 15 caracteres", 42);

    // Validações da Transação
    assert.strictEqual(mockTx.documentoFiscal.update.mock.calls.length, 1);
    const docUpdateArgs = mockTx.documentoFiscal.update.mock.calls[0].arguments[0];
    assert.strictEqual(docUpdateArgs.where.id, 1);
    assert.strictEqual(docUpdateArgs.data.status, StatusDocumentoFiscal.CANCELADA);

    assert.strictEqual(mockTx.pedidoVenda.update.mock.calls.length, 1);
    const orderUpdateArgs = mockTx.pedidoVenda.update.mock.calls[0].arguments[0];
    assert.strictEqual(orderUpdateArgs.where.id, 999);
    assert.strictEqual(orderUpdateArgs.data.status, StatusPedido.AGUARDANDO_FATURAMENTO);

    assert.strictEqual(mockTx.conta.updateMany.mock.calls.length, 1);
    const contaUpdateArgs = mockTx.conta.updateMany.mock.calls[0].arguments[0];
    assert.strictEqual(contaUpdateArgs.where.pedidoVendaId, 999);
    assert.strictEqual(contaUpdateArgs.data.status, "CANCELADA");

    // Lógica de estoque (liberação de reservas)
    assert.strictEqual(mockTx.estoqueAtual.update.mock.calls.length, 1);
    const estoqueUpdateArgs = mockTx.estoqueAtual.update.mock.calls[0].arguments[0];
    assert.strictEqual(estoqueUpdateArgs.where.id, 50);
    assert.deepStrictEqual(estoqueUpdateArgs.data, {
      quantidadeDisponivel: { increment: 2 },
      quantidadeReservada: { decrement: 2 },
    });

    assert.strictEqual(mockTx.movimentacaoEstoque.create.mock.calls.length, 1);
    const movEstoqueArgs = mockTx.movimentacaoEstoque.create.mock.calls[0].arguments[0];
    assert.strictEqual(movEstoqueArgs.data.tipo, "CANCELAMENTO_RESERVA");
    assert.strictEqual(movEstoqueArgs.data.quantidade, 2);

    assert.strictEqual(mockTx.historicoPedido.create.mock.calls.length, 1);
    const histArgs = mockTx.historicoPedido.create.mock.calls[0].arguments[0];
    assert.ok(histArgs.data.observacao.includes("Financeiro Admin"));
  });

  test("Teste 1b: Cancelamento válido, pedido em SEPARADO -> estorna saída física, cancela separação e reverte para AUTORIZADO_PARA_SEPARACAO", async () => {
    const mockDoc = {
      id: 1,
      tipo: TipoDocumentoFiscal.NFE_SAIDA,
      status: StatusDocumentoFiscal.AUTORIZADA,
      chaveAcesso: "33260699888777000188550010000000111123456780",
      protocolo: "133123456789012",
      dataAutorizacao: new Date(),
      nSeqEventoCancelamento: 1,
      empresaFiscalId: 10,
      empresaFiscal: {
        id: 10,
        cnpj: "99888777000188",
        ambienteSEFAZ: "homologacao",
      },
      pedidoVendaId: 999,
      pedidoVenda: {
        id: 999,
        numero: "PED-999",
        status: StatusPedido.SEPARADO,
        vendedor: { nome: "Vendedor Teste" },
        itens: [
          { produtoId: 101, quantidade: 2 },
        ],
      },
    };

    (prisma.documentoFiscal as any).findUnique = async () => mockDoc as any;
    (prisma.usuario as any).findUnique = async () => ({ nome: "Financeiro Admin" }) as any;

    mock.method(deps, "fetch", async () => {
      return {
        ok: true,
        text: async () => XML_RESPOSTA_SUCESSO,
      } as any;
    });

    const mockTx: any = {
      documentoFiscal: {
        update: mock.fn(async () => ({})),
      },
      pedidoVenda: {
        update: mock.fn(async () => ({})),
      },
      conta: {
        updateMany: mock.fn(async () => ({})),
      },
      separacao: {
        findUnique: mock.fn(async () => ({
          id: 5,
          status: "CONFERIDO",
          itens: [
            { produtoId: 101, loteId: 202, quantidade: 2 },
          ],
        })),
        update: mock.fn(async () => ({})),
      },
      estoqueAtual: {
        findFirst: mock.fn(async () => ({ id: 50, quantidadeDisponivel: 10 })),
        update: mock.fn(async () => ({})),
      },
      movimentacaoEstoque: {
        create: mock.fn(async () => ({})),
      },
      historicoPedido: {
        create: mock.fn(async () => ({})),
      },
    };

    (prisma as any).$transaction = async (cb: any) => {
      return cb(mockTx);
    };

    await cancelarNFe(1, "Motivo válido com mais de 15 caracteres", 42);

    // Validações da Transação
    assert.strictEqual(mockTx.pedidoVenda.update.mock.calls.length, 1);
    const orderUpdateArgs = mockTx.pedidoVenda.update.mock.calls[0].arguments[0];
    assert.strictEqual(orderUpdateArgs.data.status, StatusPedido.AUTORIZADO_PARA_SEPARACAO);

    // Lógica de estoque (estorno físico)
    assert.strictEqual(mockTx.estoqueAtual.update.mock.calls.length, 1);
    const estoqueUpdateArgs = mockTx.estoqueAtual.update.mock.calls[0].arguments[0];
    assert.deepStrictEqual(estoqueUpdateArgs.data, {
      quantidadeDisponivel: { increment: 2 },
    });

    assert.strictEqual(mockTx.movimentacaoEstoque.create.mock.calls.length, 1);
    const movEstoqueArgs = mockTx.movimentacaoEstoque.create.mock.calls[0].arguments[0];
    assert.strictEqual(movEstoqueArgs.data.tipo, "DEVOLUCAO");
    assert.strictEqual(movEstoqueArgs.data.quantidade, 2);

    // Separação deve ser atualizada para CANCELADA
    assert.strictEqual(mockTx.separacao.update.mock.calls.length, 1);
    const sepUpdateArgs = mockTx.separacao.update.mock.calls[0].arguments[0];
    assert.strictEqual(sepUpdateArgs.where.id, 5);
    assert.strictEqual(sepUpdateArgs.data.status, "CANCELADA");

    // Histórico deve registrar a reversão da separação e o cancelamento do documento
    assert.strictEqual(mockTx.historicoPedido.create.mock.calls.length, 2);
    const histArgs1 = mockTx.historicoPedido.create.mock.calls[0].arguments[0];
    assert.strictEqual(histArgs1.data.observacao, "Separação revertida por cancelamento de NF-e");
    
    const histArgs2 = mockTx.historicoPedido.create.mock.calls[1].arguments[0];
    assert.ok(histArgs2.data.observacao.includes("Financeiro Admin"));
  });

  test("Teste 2: NF-e com status PENDENTE -> lança erro descritivo", async () => {
    const mockDoc = {
      id: 2,
      tipo: TipoDocumentoFiscal.NFE_SAIDA,
      status: StatusDocumentoFiscal.PENDENTE,
      chaveAcesso: "33260699888777000188550010000000111123456780",
      protocolo: "133123456789012",
      dataAutorizacao: new Date(),
      nSeqEventoCancelamento: 1,
      empresaFiscalId: 10,
    };

    (prisma.documentoFiscal as any).findUnique = async () => mockDoc as any;

    await assert.rejects(
      cancelarNFe(2, "Motivo válido com mais de 15 caracteres", 42),
      new Error("Apenas NF-e autorizadas podem ser canceladas")
    );
  });

  test("Teste 3: NF-e com mais de 24h -> lança erro de prazo expirado", async () => {
    const dataExpirada = new Date(Date.now() - 25 * 60 * 60 * 1000); // 25 horas atrás
    const mockDoc = {
      id: 3,
      tipo: TipoDocumentoFiscal.NFE_SAIDA,
      status: StatusDocumentoFiscal.AUTORIZADA,
      chaveAcesso: "33260699888777000188550010000000111123456780",
      protocolo: "133123456789012",
      dataAutorizacao: dataExpirada,
      nSeqEventoCancelamento: 1,
      empresaFiscalId: 10,
    };

    (prisma.documentoFiscal as any).findUnique = async () => mockDoc as any;

    await assert.rejects(
      cancelarNFe(3, "Motivo válido com mais de 15 caracteres", 42),
      new Error("Prazo de cancelamento expirado. Utilize carta de correção ou devolução.")
    );
  });

  test("Teste 4: Motivo com menos de 15 caracteres -> lança erro", async () => {
    const mockDoc = {
      id: 4,
      tipo: TipoDocumentoFiscal.NFE_SAIDA,
      status: StatusDocumentoFiscal.AUTORIZADA,
      chaveAcesso: "33260699888777000188550010000000111123456780",
      protocolo: "133123456789012",
      dataAutorizacao: new Date(),
      nSeqEventoCancelamento: 1,
      empresaFiscalId: 10,
    };

    (prisma.documentoFiscal as any).findUnique = async () => mockDoc as any;

    await assert.rejects(
      cancelarNFe(4, "Muito curto", 42),
      new Error("Motivo deve ter no mínimo 15 caracteres")
    );
  });

  test("Teste 5: Pedido já despachado -> lança erro", async () => {
    const mockDoc = {
      id: 5,
      tipo: TipoDocumentoFiscal.NFE_SAIDA,
      status: StatusDocumentoFiscal.AUTORIZADA,
      chaveAcesso: "33260699888777000188550010000000111123456780",
      protocolo: "133123456789012",
      dataAutorizacao: new Date(),
      nSeqEventoCancelamento: 1,
      empresaFiscalId: 10,
      pedidoVendaId: 999,
      pedidoVenda: {
        id: 999,
        status: StatusPedido.DESPACHADO,
      },
    };

    (prisma.documentoFiscal as any).findUnique = async () => mockDoc as any;

    await assert.rejects(
      cancelarNFe(5, "Motivo válido com mais de 15 caracteres", 42),
      new Error("Pedido já despachado. Cancelamento não permitido.")
    );
  });

  test("Teste 6: Tratamento de indisponibilidade da SEFAZ -> lança 503", async () => {
    const mockDoc = {
      id: 6,
      tipo: TipoDocumentoFiscal.NFE_SAIDA,
      status: StatusDocumentoFiscal.AUTORIZADA,
      chaveAcesso: "33260699888777000188550010000000111123456780",
      protocolo: "133123456789012",
      dataAutorizacao: new Date(),
      nSeqEventoCancelamento: 1,
      empresaFiscalId: 10,
      empresaFiscal: {
        id: 10,
        cnpj: "99888777000188",
        ambienteSEFAZ: "homologacao",
      },
      pedidoVendaId: 999,
      pedidoVenda: {
        id: 999,
        status: StatusPedido.FATURADO,
        itens: [],
      },
    };

    (prisma.documentoFiscal as any).findUnique = async () => mockDoc as any;

    // Mock do fetch no deps para falhar (simulando timeout ou indisponibilidade)
    mock.method(deps, "fetch", () => {
      const error = new DOMException("The operation was aborted", "AbortError");
      return Promise.reject(error);
    });

    await assert.rejects(
      cancelarNFe(6, "Motivo válido com mais de 15 caracteres", 42),
      new Error("Serviço SEFAZ indisponível. Tente novamente mais tarde.")
    );
  });

  test("Teste 7: Rejeição de negócio pela SEFAZ -> lança erro com motivo da SEFAZ", async () => {
    const mockDoc = {
      id: 7,
      tipo: TipoDocumentoFiscal.NFE_SAIDA,
      status: StatusDocumentoFiscal.AUTORIZADA,
      chaveAcesso: "33260699888777000188550010000000111123456780",
      protocolo: "133123456789012",
      dataAutorizacao: new Date(),
      nSeqEventoCancelamento: 1,
      empresaFiscalId: 10,
      empresaFiscal: {
        id: 10,
        cnpj: "99888777000188",
        ambienteSEFAZ: "homologacao",
      },
      pedidoVendaId: 999,
      pedidoVenda: {
        id: 999,
        status: StatusPedido.FATURADO,
        itens: [],
      },
    };

    (prisma.documentoFiscal as any).findUnique = async () => mockDoc as any;

    // Mock do fetch no deps para simular retorno de rejeição da SEFAZ
    mock.method(deps, "fetch", async () => {
      return {
        ok: true,
        text: async () => XML_RESPOSTA_REJEICAO,
      } as any;
    });

    await assert.rejects(
      cancelarNFe(7, "Motivo válido com mais de 15 caracteres", 42),
      new Error("Rejeição SEFAZ (Evento): Rejeição: Schema XML inválido")
    );
  });
});
