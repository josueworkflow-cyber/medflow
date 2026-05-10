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
      estoqueComProduto,
      proximosVencer,
      vencidos,
      faturamentoMes,
      pedidosAbertos,
      aguardandoEstoque,
      aguardandoFinanceiro,
      aguardandoCliente,
      autorizadosSeparacao,
      produtosComPreco,
      topProdutos,
      vendasPorCliente,
    ] = await Promise.all([
      prisma.produto.count({ where: { ativo: true } }),
      prisma.estoqueAtual.aggregate({ _sum: { quantidadeDisponivel: true } }),
      prisma.estoqueAtual.findMany({ include: { produto: { select: { precoCustoBase: true } } } }),
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
      prisma.produto.findMany({
        where: { ativo: true, precoCustoBase: { gt: 0 }, precoVendaBase: { gt: 0 } },
        select: { precoCustoBase: true, precoVendaBase: true },
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

    const valorEstoque = estoqueComProduto.reduce(
      (sum, e) => sum + e.quantidadeDisponivel * (e.produto?.precoCustoBase || 0),
      0
    );

    const margemMedia =
      produtosComPreco.length > 0
        ? produtosComPreco.reduce(
            (sum, p) => sum + ((p.precoVendaBase - p.precoCustoBase) / p.precoCustoBase) * 100,
            0
          ) / produtosComPreco.length
        : 0;

    const [topProdutosCompletos, vendasPorClienteCompletos] = await Promise.all([
      Promise.all(
        topProdutos.map(async (item) => {
          const produto = await prisma.produto.findUnique({
            where: { id: item.produtoId },
            select: { descricao: true },
          });
          return {
            produtoId: item.produtoId,
            descricao: produto?.descricao || "-",
            qtdVendida: item._sum.quantidade || 0,
            valorTotal: item._sum.subtotal || 0,
          };
        })
      ),
      Promise.all(
        vendasPorCliente.map(async (item) => {
          const cliente = await prisma.cliente.findUnique({
            where: { id: item.clienteId },
            select: { razaoSocial: true },
          });
          return {
            clienteId: item.clienteId,
            razaoSocial: cliente?.razaoSocial || "-",
            totalVendas: item._sum.valorTotal || 0,
            qtdPedidos: item._count,
          };
        })
      ),
    ]);

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
      margemMedia: Number(margemMedia.toFixed(1)),
      topProdutos: topProdutosCompletos,
      vendasPorCliente: vendasPorClienteCompletos,
    });
  } catch (error) {
    console.error("GET /api/dashboard", error);
    return NextResponse.json({ error: "Erro ao gerar dashboard." }, { status: 500 });
  }
}
