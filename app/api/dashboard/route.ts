import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const hoje = new Date();
    const em30dias = new Date(hoje.getTime() + 30 * 24 * 60 * 60 * 1000);
    const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);

    // SKUs ativos
    const skusAtivos = await prisma.produto.count({ where: { ativo: true } });

    // Itens em estoque
    const estoqueTotal = await prisma.estoqueAtual.aggregate({
      _sum: { quantidadeDisponivel: true },
    });

    // Valor total em estoque (disponível x custo base do produto)
    const estoqueComProduto = await prisma.estoqueAtual.findMany({
      include: { produto: { select: { precoCustoBase: true } } },
    });
    const valorEstoque = estoqueComProduto.reduce(
      (sum, e) => sum + e.quantidadeDisponivel * (e.produto?.precoCustoBase || 0),
      0
    );

    // Próximos do vencimento (30 dias)
    const proximosVencer = await prisma.lote.count({
      where: {
        validade: { gte: hoje, lte: em30dias },
        estoqueAtual: { some: { quantidadeDisponivel: { gt: 0 } } },
      },
    });

    // Vencidos
    const vencidos = await prisma.lote.count({
      where: {
        validade: { lt: hoje },
        estoqueAtual: { some: { quantidadeDisponivel: { gt: 0 } } },
      },
    });

    // Faturamento do mês (pedidos de venda faturados)
    const faturamentoMes = await prisma.pedidoVenda.aggregate({
      where: {
        status: { in: ["FATURADO", "ENTREGUE", "FINALIZADO"] },
        createdAt: { gte: inicioMes, lte: fimMes },
      },
      _sum: { valorTotal: true },
      _count: true,
    });

    // Pedidos em aberto
    const pedidosAbertos = await prisma.pedidoVenda.count({
      where: { status: { in: ["PEDIDO_CRIADO", "RESERVADO", "AGUARDANDO_APROVACAO_FINANCEIRA", "APROVADO_FINANCEIRO", "EM_SEPARACAO", "SEPARADO"] } },
    });

    // Margem média (produtos com custo e venda > 0)
    const produtosComPreco = await prisma.produto.findMany({
      where: { ativo: true, precoCustoBase: { gt: 0 }, precoVendaBase: { gt: 0 } },
      select: { precoCustoBase: true, precoVendaBase: true },
    });
    const margemMedia =
      produtosComPreco.length > 0
        ? produtosComPreco.reduce(
            (sum, p) =>
              sum + ((p.precoVendaBase - p.precoCustoBase) / p.precoCustoBase) * 100,
            0
          ) / produtosComPreco.length
        : 0;

    // Produtos mais vendidos (top 5)
    const topProdutos = await prisma.itemPedidoVenda.groupBy({
      by: ["produtoId"],
      _sum: { quantidade: true, subtotal: true },
      orderBy: { _sum: { quantidade: "desc" } },
      take: 5,
    });

    const topProdutosCompletos = await Promise.all(
      topProdutos.map(async (item) => {
        const produto = await prisma.produto.findUnique({
          where: { id: item.produtoId },
          select: { descricao: true },
        });
        return {
          produtoId: item.produtoId,
          descricao: produto?.descricao || "—",
          qtdVendida: item._sum.quantidade || 0,
          valorTotal: item._sum.subtotal || 0,
        };
      })
    );

    // Vendas por cliente (top 5)
    const vendasPorCliente = await prisma.pedidoVenda.groupBy({
      by: ["clienteId"],
      where: { status: { in: ["FATURADO", "ENTREGUE", "FINALIZADO"] } },
      _sum: { valorTotal: true },
      _count: true,
      orderBy: { _sum: { valorTotal: "desc" } },
      take: 5,
    });

    const vendasPorClienteCompletos = await Promise.all(
      vendasPorCliente.map(async (item) => {
        const cliente = await prisma.cliente.findUnique({
          where: { id: item.clienteId },
          select: { razaoSocial: true },
        });
        return {
          clienteId: item.clienteId,
          razaoSocial: cliente?.razaoSocial || "—",
          totalVendas: item._sum.valorTotal || 0,
          qtdPedidos: item._count,
        };
      })
    );

    return NextResponse.json({
      skusAtivos,
      itensEstoque: estoqueTotal._sum.quantidadeDisponivel || 0,
      valorEstoque,
      proximosVencer,
      vencidos,
      faturamentoMes: faturamentoMes._sum.valorTotal || 0,
      qtdVendasMes: faturamentoMes._count,
      pedidosAbertos,
      margemMedia: Number(margemMedia.toFixed(1)),
      topProdutos: topProdutosCompletos,
      vendasPorCliente: vendasPorClienteCompletos,
    });
  } catch (error) {
    console.error("GET /api/dashboard", error);
    return NextResponse.json({ error: "Erro ao gerar dashboard." }, { status: 500 });
  }
}
