import { test, describe, mock, before, afterEach } from "node:test";
import assert from "node:assert";
import { prisma } from "@/lib/prisma";
import { MapaDistribuicaoService } from "@/lib/services/estoque/mapa-distribuicao.service";

describe("Mapa de Distribuição de Lote", () => {
  let originalFindUniqueLote: any;
  let originalFindManyMov: any;
  let originalFindManyDoc: any;
  let originalAggregateEstoque: any;

  before(() => {
    originalFindUniqueLote = (prisma.lote as any).findUnique;
    originalFindManyMov = (prisma.movimentacaoEstoque as any).findMany;
    originalFindManyDoc = (prisma.documentoFiscal as any).findMany;
    originalAggregateEstoque = (prisma.estoqueAtual as any).aggregate;
  });

  afterEach(() => {
    (prisma.lote as any).findUnique = originalFindUniqueLote;
    (prisma.movimentacaoEstoque as any).findMany = originalFindManyMov;
    (prisma.documentoFiscal as any).findMany = originalFindManyDoc;
    (prisma.estoqueAtual as any).aggregate = originalAggregateEstoque;
    mock.reset();
  });

  test("Lote com entradas e saídas → retorna EntradaLote[] e SaidaLote[] corretamente populados", async () => {
    const mockLote = {
      id: 1,
      numeroLote: "LOTE100",
      validade: new Date("2026-12-31"),
      status: "DISPONIVEL",
      motivoBloqueio: null,
      bloqueadoEm: null,
      produto: { id: 10, descricao: "Produto Teste", ncm: "12345678", registroAnvisa: "ANV123", fabricante: "Fab Teste" },
      fornecedor: { id: 5, razaoSocial: "Fornecedor Teste" }
    };

    const mockMovimentacoes = [
      {
        tipo: "ENTRADA",
        quantidade: 100,
        createdAt: new Date("2026-06-01T10:00:00Z"),
        origem: "NF-e de Entrada: 35220600000000000000000000000000000000000000",
        usuario: "User1",
        usuarioRef: { nome: "Usuário Um" },
        pedidoVendaId: null,
        pedidoVenda: null
      },
      {
        tipo: "SAIDA",
        quantidade: 30,
        createdAt: new Date("2026-06-02T14:30:00Z"),
        origem: null,
        usuario: "User2",
        usuarioRef: null,
        pedidoVendaId: 50,
        pedidoVenda: {
          numero: "PED-50",
          tipoPedido: "PEDIDO_NORMAL",
          status: "FATURADO",
          cliente: { razaoSocial: "Hospital das Clínicas" },
          documentosFiscais: [
            { tipo: "NFE_SAIDA", numero: "2001", chaveAcesso: "35220611111111111111111111111111111111111111" }
          ]
        }
      }
    ];

    const mockDocsFiscaisEntrada = [
      { tipo: "NFE_ENTRADA", numero: "900", chaveAcesso: "35220600000000000000000000000000000000000000" }
    ];

    const mockEstoqueSaldos = {
      _sum: {
        quantidadeDisponivel: 70,
        quantidadeReservada: 0
      }
    };

    (prisma.lote as any).findUnique = async () => mockLote as any;
    (prisma.movimentacaoEstoque as any).findMany = async () => mockMovimentacoes as any;
    (prisma.documentoFiscal as any).findMany = async () => mockDocsFiscaisEntrada as any;
    (prisma.estoqueAtual as any).aggregate = async () => mockEstoqueSaldos as any;

    const res = await MapaDistribuicaoService.getMapaDistribuicao(1);

    // Lote & Produto
    assert.strictEqual(res.lote.numeroLote, "LOTE100");
    assert.strictEqual(res.produto.descricao, "Produto Teste");

    // Entradas
    assert.strictEqual(res.entradas.length, 1);
    assert.strictEqual(res.entradas[0].origem, "NF-e 900");
    assert.strictEqual(res.entradas[0].tipoBadge, "Entrada NF-e");
    assert.strictEqual(res.entradas[0].fornecedor, "Fornecedor Teste");
    assert.strictEqual(res.entradas[0].usuario, "Usuário Um");

    // Saídas
    assert.strictEqual(res.saidas.length, 1);
    assert.strictEqual(res.saidas[0].cliente, "Hospital das Clínicas");
    assert.strictEqual(res.saidas[0].pedidoNumero, "PED-50");
    assert.strictEqual(res.saidas[0].tipo, "PEDIDO_NORMAL");
    assert.strictEqual(res.saidas[0].nfNumero, "2001");
    assert.strictEqual(res.saidas[0].nfChave, "35220611111111111111111111111111111111111111");
  });

  test("Lote com pedido interno → SaidaLote.tipo = 'PEDIDO_INTERNO' e nfNumero = null", async () => {
    const mockLote = {
      id: 2,
      numeroLote: "LOTE200",
      validade: null,
      status: "DISPONIVEL",
      motivoBloqueio: null,
      bloqueadoEm: null,
      produto: { id: 11, descricao: "Soro Fisiológico", ncm: null, registroAnvisa: null, fabricante: null },
      fornecedor: null
    };

    const mockMovimentacoes = [
      {
        tipo: "SAIDA",
        quantidade: 10,
        createdAt: new Date("2026-06-03T09:00:00Z"),
        origem: null,
        usuario: "UserInternal",
        usuarioRef: null,
        pedidoVendaId: 60,
        pedidoVenda: {
          numero: "PED-60_INT",
          tipoPedido: "PEDIDO_INTERNO",
          status: "SEPARADO",
          cliente: { razaoSocial: "Centro Cirúrgico B" },
          documentosFiscais: [] // Sem NFe de saída
        }
      }
    ];

    const mockEstoqueSaldos = {
      _sum: {
        quantidadeDisponivel: 0,
        quantidadeReservada: 0
      }
    };

    (prisma.lote as any).findUnique = async () => mockLote as any;
    (prisma.movimentacaoEstoque as any).findMany = async () => mockMovimentacoes as any;
    (prisma.documentoFiscal as any).findMany = async () => [] as any;
    (prisma.estoqueAtual as any).aggregate = async () => mockEstoqueSaldos as any;

    const res = await MapaDistribuicaoService.getMapaDistribuicao(2);

    assert.strictEqual(res.saidas.length, 1);
    assert.strictEqual(res.saidas[0].tipo, "PEDIDO_INTERNO");
    assert.strictEqual(res.saidas[0].nfNumero, null);
    assert.strictEqual(res.saidas[0].nfChave, null);
  });

  test("Lote com pedido com NF → SaidaLote.nfNumero e nfChave preenchidos", async () => {
    const mockLote = {
      id: 3,
      numeroLote: "LOTE300",
      validade: null,
      status: "DISPONIVEL",
      motivoBloqueio: null,
      bloqueadoEm: null,
      produto: { id: 12, descricao: "Dipirona Ampola", ncm: null, registroAnvisa: null, fabricante: null },
      fornecedor: null
    };

    const mockMovimentacoes = [
      {
        tipo: "SAIDA",
        quantidade: 5,
        createdAt: new Date("2026-06-04T11:00:00Z"),
        origem: null,
        usuario: "Admin",
        usuarioRef: null,
        pedidoVendaId: 70,
        pedidoVenda: {
          numero: "PED-70",
          tipoPedido: "PEDIDO_NORMAL",
          status: "FATURADO",
          cliente: { razaoSocial: "Hospital São Luiz" },
          documentosFiscais: [
            { tipo: "NFE_SAIDA", numero: "5555", chaveAcesso: "35220677777777777777777777777777777777777777" }
          ]
        }
      }
    ];

    const mockEstoqueSaldos = {
      _sum: {
        quantidadeDisponivel: 15,
        quantidadeReservada: 0
      }
    };

    (prisma.lote as any).findUnique = async () => mockLote as any;
    (prisma.movimentacaoEstoque as any).findMany = async () => mockMovimentacoes as any;
    (prisma.documentoFiscal as any).findMany = async () => [] as any;
    (prisma.estoqueAtual as any).aggregate = async () => mockEstoqueSaldos as any;

    const res = await MapaDistribuicaoService.getMapaDistribuicao(3);

    assert.strictEqual(res.saidas.length, 1);
    assert.strictEqual(res.saidas[0].nfNumero, "5555");
    assert.strictEqual(res.saidas[0].nfChave, "35220677777777777777777777777777777777777777");
  });

  test("Lote sem movimentações → retorna arrays vazios e resumo zerado", async () => {
    const mockLote = {
      id: 4,
      numeroLote: "LOTE400",
      validade: null,
      status: "DISPONIVEL",
      motivoBloqueio: null,
      bloqueadoEm: null,
      produto: { id: 13, descricao: "Gaze Estéril", ncm: null, registroAnvisa: null, fabricante: null },
      fornecedor: null
    };

    const mockEstoqueSaldos = {
      _sum: {
        quantidadeDisponivel: null,
        quantidadeReservada: null
      }
    };

    (prisma.lote as any).findUnique = async () => mockLote as any;
    (prisma.movimentacaoEstoque as any).findMany = async () => [] as any;
    (prisma.documentoFiscal as any).findMany = async () => [] as any;
    (prisma.estoqueAtual as any).aggregate = async () => mockEstoqueSaldos as any;

    const res = await MapaDistribuicaoService.getMapaDistribuicao(4);

    assert.strictEqual(res.entradas.length, 0);
    assert.strictEqual(res.saidas.length, 0);
    assert.strictEqual(res.resumo.totalEntrado, 0);
    assert.strictEqual(res.resumo.totalSaido, 0);
    assert.strictEqual(res.resumo.totalDisponivel, 0);
    assert.strictEqual(res.resumo.totalReservado, 0);
    assert.strictEqual(res.resumo.totalPerdas, 0);
  });

  test("Resumo calculado corretamente — totalEntrado - totalSaido = totalDisponivel + totalReservado + totalPerdas", async () => {
    const mockLote = {
      id: 5,
      numeroLote: "LOTE500",
      validade: null,
      status: "DISPONIVEL",
      motivoBloqueio: null,
      bloqueadoEm: null,
      produto: { id: 14, descricao: "Soro Ringer", ncm: null, registroAnvisa: null, fabricante: null },
      fornecedor: null
    };

    // Mocks contendo:
    // Entrada: 150
    // Saída: 60
    // Perda: 10
    // EstoqueAtual: Disponível = 70, Reservado = 10
    // Nota: A soma física do que resta no estoque (70+10) + perdas (10) + saídas (60) deve somar 150.
    const mockMovimentacoes = [
      { tipo: "ENTRADA", quantidade: 150, createdAt: new Date(), origem: "Manual", usuario: "Admin", usuarioRef: null },
      { tipo: "SAIDA", quantidade: 60, createdAt: new Date(), origem: null, usuario: "Admin", usuarioRef: null },
      { tipo: "PERDA", quantidade: 10, createdAt: new Date(), origem: null, usuario: "Admin", usuarioRef: null }
    ];

    const mockEstoqueSaldos = {
      _sum: {
        quantidadeDisponivel: 70,
        quantidadeReservada: 10
      }
    };

    (prisma.lote as any).findUnique = async () => mockLote as any;
    (prisma.movimentacaoEstoque as any).findMany = async () => mockMovimentacoes as any;
    (prisma.documentoFiscal as any).findMany = async () => [] as any;
    (prisma.estoqueAtual as any).aggregate = async () => mockEstoqueSaldos as any;

    const res = await MapaDistribuicaoService.getMapaDistribuicao(5);

    const leftHandSide = res.resumo.totalEntrado - res.resumo.totalSaido;
    const rightHandSide = res.resumo.totalDisponivel + res.resumo.totalReservado + res.resumo.totalPerdas;

    assert.strictEqual(leftHandSide, rightHandSide);
    assert.strictEqual(res.resumo.totalEntrado, 150);
  });
});
