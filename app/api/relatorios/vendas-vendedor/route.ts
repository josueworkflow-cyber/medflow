import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthActor, assertPerfil } from "@/lib/authz";
import { StatusPedido } from "@prisma/client";
import { parseDateParam } from "@/lib/relatorios/date-helpers";

export async function GET(req: NextRequest) {
  const actor = await getAuthActor();
  if (!actor) return NextResponse.json({ error: "Nao autorizado." }, { status: 401 });
  
  try {
    assertPerfil(actor, ["ADMINISTRADOR", "VENDAS"]);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const dataInicioStr = searchParams.get("dataInicio");
    const dataFimStr = searchParams.get("dataFim");

    const start = parseDateParam(dataInicioStr, false);
    const end = parseDateParam(dataFimStr, true);

    /**
     * STATUS FILTERS DOCUMENTATION (AS REQUESTED):
     * 
     * We explicitly include only statuses that represent completed, confirmed, or finalized sales:
     * - "FATURADO", "AUTORIZADO_PARA_SEPARACAO", "EM_SEPARACAO", "SEPARADO", "DESPACHADO", "FINALIZADO".
     * 
     * We EXCLUDE the following statuses:
     * - "PEDIDO_CRIADO" (draft), pending stock checking statuses, pending financial approval statuses,
     *   negotiation/client confirmation statuses, and "CANCELADO", "CANCELADO_PELO_CLIENTE".
     */
    const statusValidos: StatusPedido[] = [
      "FATURADO",
      "AUTORIZADO_PARA_SEPARACAO",
      "EM_SEPARACAO",
      "SEPARADO",
      "DESPACHADO",
      "FINALIZADO",
    ];

    // Query 1: Aggregate sales per seller using a single groupBy query (prevents N+1 database hits)
    const agrupado = await prisma.pedidoVenda.groupBy({
      by: ["vendedorId"],
      where: {
        tipoPedido: "PEDIDO_NORMAL",
        status: { in: statusValidos },
        createdAt: { gte: start, lte: end },
        vendedorId: { not: null },
      },
      _sum: { valorTotal: true },
      _count: true,
    });

    // Query 2: Fetch all sellers
    const vendedores = await prisma.vendedor.findMany();

    // Map aggregated metrics for quick O(1) lookup
    const performanceMap = new Map(
      agrupado.map((item) => [
        item.vendedorId,
        {
          totalVendas: item._sum.valorTotal || 0,
          qtdPedidos: item._count,
        },
      ])
    );

    const performance = vendedores.map((v) => {
      const perf = performanceMap.get(v.id) || { totalVendas: 0, qtdPedidos: 0 };
      const totalVendas = perf.totalVendas;
      const qtdPedidos = perf.qtdPedidos;

      // Commission calculation based on the commission rate configured for the seller
      const comissaoGerada = (v.comissao / 100) * totalVendas;

      // Goal/Meta calculation handling the edge case (division by zero / empty meta)
      let percentualMeta: number | null = null;
      if (v.metaMensal && v.metaMensal > 0) {
        percentualMeta = Number(((totalVendas / v.metaMensal) * 100).toFixed(2));
      }

      return {
        vendedorId: v.id,
        nome: v.nome,
        email: v.email,
        totalVendas: Number(totalVendas.toFixed(2)),
        qtdPedidos,
        comissaoGerada: Number(comissaoGerada.toFixed(2)),
        metaMensal: v.metaMensal,
        percentualMeta,
        ativo: v.ativo,
      };
    });

    // Filter out inactive sellers who had 0 sales in the period to keep the report clean
    const filteredPerformance = performance.filter((p) => p.ativo || p.totalVendas > 0);

    // Sort by total sales value descending
    filteredPerformance.sort((a, b) => b.totalVendas - a.totalVendas);

    return NextResponse.json(filteredPerformance);
  } catch (error) {
    console.error("GET /api/relatorios/vendas-vendedor", error);
    return NextResponse.json({ error: "Erro ao buscar vendas por vendedor." }, { status: 500 });
  }
}
