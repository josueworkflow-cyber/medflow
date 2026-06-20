import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthActor } from "@/lib/authz";

export async function GET() {
  const actor = await getAuthActor();
  if (!actor) return NextResponse.json({ error: "Nao autorizado." }, { status: 401 });
  try {
    const hoje = new Date();
    const em30dias = new Date(hoje.getTime() + 30 * 24 * 60 * 60 * 1000);
    const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);

    const [
      skusAtivos,
      estoqueTotal,
      proximosVencer,
      vencidos,
      faturamentoMes,
      pedidosAbertos,
      aguardandoEstoque,
      aguardandoFinanceiro,
      aguardandoCliente,
      autorizadosSeparacao,
      topProdutos,
      vendasPorCliente,
    ] = await Promise.all([
      prisma.produto.count({ where: { ativo: true } }),
      prisma.estoqueAtual.aggregate({ _sum: { quantidadeDisponivel: true } }),
      prisma.lote.count({
        where: {
          validade: { gte: hoje, lte: em30dias },
          estoqueAtual: { some: { quantidadeDisponivel: { gt: 0 } } },
        },
      }),
      prisma.lote.count({
        where: {
          validade: { lt: hoje },
          estoqueAtual: { some: { quantidadeDisponivel: { gt: 0 } } },
        },
      }),
      prisma.pedidoVenda.aggregate({
        where: {
          tipoPedido: "PEDIDO_NORMAL",
          status: { in: ["FATURADO", "AUTORIZADO_PARA_SEPARACAO", "EM_SEPARACAO", "SEPARADO", "DESPACHADO", "FINALIZADO"] },
          createdAt: { gte: inicioMes, lte: fimMes },
        },
        _sum: { valorTotal: true },
        _count: true,
      }),
      prisma.pedidoVenda.count({
        where: {
          status: {
            in: [
              "PEDIDO_CRIADO",
              "AGUARDANDO_ESTOQUE",
              "ESTOQUE_PARCIAL",
              "ESTOQUE_INDISPONIVEL",
              "AGUARDANDO_FORNECEDOR",
              "AGUARDANDO_APROVACAO_FINANCEIRA",
              "PAGAMENTO_PENDENTE",
              "CONDICAO_COMERCIAL_PENDENTE",
              "AGUARDANDO_CONFIRMACAO_CLIENTE",
              "AGUARDANDO_FATURAMENTO",
              "AUTORIZADO_PARA_SEPARACAO",
              "EM_SEPARACAO",
              "SEPARADO",
            ],
          },
        },
      }),
      prisma.pedidoVenda.count({
        where: {
          status: {
            in: [
              "PEDIDO_CRIADO",
              "AGUARDANDO_ESTOQUE",
              "ESTOQUE_PARCIAL",
              "ESTOQUE_INDISPONIVEL",
              "AGUARDANDO_FORNECEDOR",
            ],
          },
        },
      }),
      prisma.pedidoVenda.count({
        where: {
          status: {
            in: [
              "AGUARDANDO_APROVACAO_FINANCEIRA",
              "PAGAMENTO_PENDENTE",
              "CONDICAO_COMERCIAL_PENDENTE",
              "AGUARDANDO_FATURAMENTO",
            ],
          },
        },
      }),
      prisma.pedidoVenda.count({
        where: { status: "AGUARDANDO_CONFIRMACAO_CLIENTE" },
      }),
      prisma.pedidoVenda.count({
        where: { status: { in: ["AUTORIZADO_PARA_SEPARACAO", "EM_SEPARACAO", "SEPARADO"] } },
      }),
      prisma.itemPedidoVenda.groupBy({
        by: ["produtoId"],
        where: {
          pedidoVenda: {
            tipoPedido: "PEDIDO_NORMAL",
            status: { in: ["FATURADO", "AUTORIZADO_PARA_SEPARACAO", "EM_SEPARACAO", "SEPARADO", "DESPACHADO", "FINALIZADO"] },
          },
        },
        _sum: { quantidade: true, subtotal: true },
        orderBy: { _sum: { quantidade: "desc" } },
        take: 5,
      }),
      prisma.pedidoVenda.groupBy({
        by: ["clienteId"],
        where: {
          tipoPedido: "PEDIDO_NORMAL",
          status: { in: ["FATURADO", "AUTORIZADO_PARA_SEPARACAO", "EM_SEPARACAO", "SEPARADO", "DESPACHADO", "FINALIZADO"] },
        },
        _sum: { valorTotal: true },
        _count: true,
        orderBy: { _sum: { valorTotal: "desc" } },
        take: 5,
      }),
    ]);

    const [[estoqueValorResult], [margemResult]] = await Promise.all([
      prisma.$queryRaw<[{ total: any }]>`
        SELECT COALESCE(SUM(e."quantidadeDisponivel" * p."precoCustoBase"), 0) as total
        FROM "EstoqueAtual" e
        JOIN "Produto" p ON e."produtoId" = p.id
      `,
      prisma.$queryRaw<[{ media: any }]>`
        SELECT COALESCE(AVG(("precoVendaBase" - "precoCustoBase") / NULLIF("precoCustoBase", 0) * 100), 0) as media
        FROM "Produto"
        WHERE ativo = true AND "precoCustoBase" > 0 AND "precoVendaBase" > 0
      `
    ]);

    const valorEstoque = Number(estoqueValorResult?.total || 0);
    const margemMedia = Number(Number(margemResult?.media || 0).toFixed(1));

    const produtoIds = topProdutos.map(p => p.produtoId);
    const clienteIds = vendasPorCliente.map(v => v.clienteId);

    const [produtosInfo, clientesInfo] = await Promise.all([
      prisma.produto.findMany({
        where: { id: { in: produtoIds } },
        select: { id: true, descricao: true },
      }),
      prisma.cliente.findMany({
        where: { id: { in: clienteIds } },
        select: { id: true, razaoSocial: true },
      }),
    ]);

    const produtoMap = new Map(produtosInfo.map(p => [p.id, p.descricao]));
    const clienteMap = new Map(clientesInfo.map(c => [c.id, c.razaoSocial]));

    const topProdutosCompletos = topProdutos.map(item => ({
      produtoId: item.produtoId,
      descricao: produtoMap.get(item.produtoId) || "-",
      qtdVendida: item._sum.quantidade || 0,
      valorTotal: item._sum.subtotal || 0,
    }));

    const vendasPorClienteCompletos = vendasPorCliente.map(item => ({
      clienteId: item.clienteId,
      razaoSocial: clienteMap.get(item.clienteId) || "-",
      totalVendas: item._sum.valorTotal || 0,
      qtdPedidos: item._count,
    }));

    return NextResponse.json({
      skusAtivos,
      itensEstoque: estoqueTotal._sum.quantidadeDisponivel || 0,
      valorEstoque,
      proximosVencer,
      vencidos,
      faturamentoMes: faturamentoMes._sum.valorTotal || 0,
      qtdVendasMes: faturamentoMes._count,
      pedidosAbertos,
      aguardandoEstoque,
      aguardandoFinanceiro,
      aguardandoCliente,
      autorizadosSeparacao,
      margemMedia,
      topProdutos: topProdutosCompletos,
      vendasPorCliente: vendasPorClienteCompletos,
    });
  } catch (error) {
    console.error("GET /api/dashboard", error);
    return NextResponse.json({ error: "Erro ao gerar dashboard." }, { status: 500 });
  }
}
