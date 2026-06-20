import { test, describe, mock, before, afterEach } from "node:test";
import assert from "node:assert";
import { prisma } from "@/lib/prisma";
import { PedidoService } from "@/lib/services/pedido.service";
import { EstoqueService } from "@/lib/services/estoque.service";
import { StatusPedido, PerfilUsuario } from "@prisma/client";

describe("Bloqueio de Estoque e Validações de Lote", () => {
  let originalFindUniqueDoc: any;
  let originalFindUniqueUser: any;
  let originalTransaction: any;
  let originalFindUniquePedido: any;
  let originalFindManyEstoque: any;
  let originalFindManyMov: any;
  let originalFindFirstLote: any;
  let originalFindUniqueProduto: any;
  let originalUpdatePedido: any;
  let originalCreateHistorico: any;

  before(() => {
    originalFindUniqueDoc = (prisma.documentoFiscal as any).findUnique;
    originalFindUniqueUser = (prisma.usuario as any).findUnique;
    originalTransaction = (prisma as any).$transaction;
    originalFindUniquePedido = (prisma.pedidoVenda as any).findUnique;
    originalFindManyEstoque = (prisma.estoqueAtual as any).findMany;
    originalFindManyMov = (prisma.movimentacaoEstoque as any).findMany;
    originalFindFirstLote = (prisma.lote as any).findFirst;
    originalFindUniqueProduto = (prisma.produto as any).findUnique;
    originalUpdatePedido = (prisma.pedidoVenda as any).update;
    originalCreateHistorico = (prisma.historicoPedido as any).create;
  });

  afterEach(() => {
    (prisma.documentoFiscal as any).findUnique = originalFindUniqueDoc;
    (prisma.usuario as any).findUnique = originalFindUniqueUser;
    (prisma as any).$transaction = originalTransaction;
    (prisma.pedidoVenda as any).findUnique = originalFindUniquePedido;
    (prisma.estoqueAtual as any).findMany = originalFindManyEstoque;
    (prisma.movimentacaoEstoque as any).findMany = originalFindManyMov;
    (prisma.lote as any).findFirst = originalFindFirstLote;
    (prisma.produto as any).findUnique = originalFindUniqueProduto;
    (prisma.pedidoVenda as any).update = originalUpdatePedido;
    (prisma.historicoPedido as any).create = originalCreateHistorico;
    mock.reset();
  });

  test("Tentativa de reservar produto com todos os lotes vencidos → lança erro descritivo", async () => {
    const mockPedido = {
      id: 999,
      numero: "PED-999",
      status: StatusPedido.AGUARDANDO_FATURAMENTO,
      itens: [
        { produtoId: 101, quantidade: 5 }
      ]
    };

    (prisma.pedidoVenda as any).findUnique = async () => mockPedido as any;
    (prisma.usuario as any).findUnique = async () => ({ nome: "Estoque Admin" }) as any;
    
    // Mock do lote.findFirst retornando null para simular que todos os lotes estão indisponíveis/vencidos
    (prisma.lote as any).findFirst = async () => null;
    (prisma.produto as any).findUnique = async () => ({ id: 101, descricao: "Medicamento Teste" }) as any;

    // Mock das atualizações de status de falha
    const updatePedidoMock = mock.fn(async () => ({}));
    const createHistoricoMock = mock.fn(async () => ({}));

    (prisma.pedidoVenda as any).update = updatePedidoMock;
    (prisma.historicoPedido as any).create = createHistoricoMock;

    // Mock da transação
    (prisma as any).$transaction = async (cb: any) => {
      const mockTx: any = {
        lote: {
          findFirst: mock.fn(async () => null)
        },
        produto: {
          findUnique: mock.fn(async () => ({ id: 101, descricao: "Medicamento Teste" }))
        },
        estoqueAtual: {
          findMany: mock.fn(async () => []),
          update: mock.fn(async () => ({}))
        },
        movimentacaoEstoque: {
          create: mock.fn(async () => ({}))
        },
        pedidoVenda: {
          update: updatePedidoMock
        },
        historicoPedido: {
          create: createHistoricoMock
        }
      };
      return cb(mockTx);
    };

    const mockActor = { usuarioId: 1, perfil: PerfilUsuario.ESTOQUE };

    await assert.rejects(
      PedidoService.confirmarEstoque(999, mockActor),
      /Produto Medicamento Teste sem lote disponível válido/
    );

    // Deve ter transicionado o pedido para ESTOQUE_INDISPONIVEL
    assert.strictEqual(updatePedidoMock.mock.calls.length, 1);
    const updateArgs = updatePedidoMock.mock.calls[0].arguments[0];
    assert.strictEqual(updateArgs.data.status, StatusPedido.ESTOQUE_INDISPONIVEL);
  });

  test("Tentativa de separar lote em QUARENTENA → lança erro descritivo", async () => {
    const mockPedido = {
      id: 999,
      numero: "PED-999",
      status: StatusPedido.FATURADO,
      itens: [
        { produtoId: 101, quantidade: 5 }
      ]
    };

    (prisma.pedidoVenda as any).findUnique = async () => mockPedido as any;
    (prisma.usuario as any).findUnique = async () => ({ nome: "Estoque Admin" }) as any;

    const mockReserva = {
      id: 88,
      produtoId: 101,
      loteId: 202,
      lote: {
        id: 202,
        numeroLote: "LOTE-QUAR",
        status: "QUARENTENA",
        produto: {
          descricao: "Medicamento Teste"
        }
      }
    };

    (prisma.movimentacaoEstoque as any).findMany = async () => [mockReserva] as any;
    const mockActor = { usuarioId: 1, perfil: PerfilUsuario.ESTOQUE };

    await assert.rejects(
      PedidoService.iniciarSeparacao(999, mockActor),
      /Lote LOTE-QUAR do produto Medicamento Teste está QUARENTENA e não pode ser separado/
    );
  });

  test("Entrada de lote com validade anterior a hoje → lança erro descritivo", async () => {
    const ontem = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    (prisma.produto as any).findUnique = async () => ({ id: 101, controlaLote: true, controlaValidade: true }) as any;

    await assert.rejects(
      EstoqueService.registrarEntrada({
        produtoId: 101,
        quantidade: 10,
        numeroLote: "LOTE-VENCIDO",
        validade: ontem,
      }),
      /já está vencido/
    );
  });
});
