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

    // Query 1: Totais do período (with date filters in the database)
    const porPeriodo = await prisma.pedidoVenda.groupBy({
      by: ["clienteId"],
      where: {
        tipoPedido: "PEDIDO_NORMAL",
        status: { in: statusValidos },
        createdAt: { gte: start, lte: end },
      },
      _sum: { valorTotal: true },
      _count: true,
    });

    // Query 2: LTV histórico (without date filters in the database)
    const ltvTotal = await prisma.pedidoVenda.groupBy({
      by: ["clienteId"],
      where: {
        tipoPedido: "PEDIDO_NORMAL",
        status: { in: statusValidos },
      },
      _sum: { valorTotal: true },
    });

    // Get all unique cliente IDs that have any sales history (LTV > 0)
    const clienteIds = ltvTotal.map((item) => item.clienteId as number);

    // Query 3: Fetch client details for those who have purchase history
    const clientes = await prisma.cliente.findMany({
      where: {
        id: { in: clienteIds },
      },
      select: {
        id: true,
        razaoSocial: true,
        cnpjCpf: true,
      },
    });

    // Create maps for fast O(1) in-memory lookups
    const periodMap = new Map(
      porPeriodo.map((item) => [
        item.clienteId,
        {
          totalVendasPeriodo: item._sum.valorTotal || 0,
          qtdPedidosPeriodo: item._count,
        },
      ])
    );

    const ltvMap = new Map(
      ltvTotal.map((item) => [
        item.clienteId,
        item._sum.valorTotal || 0,
      ])
    );

    const reportData = clientes.map((c) => {
      const periodData = periodMap.get(c.id) || { totalVendasPeriodo: 0, qtdPedidosPeriodo: 0 };
      const ltvHistorico = ltvMap.get(c.id) || 0;

      const totalVendasPeriodo = periodData.totalVendasPeriodo;
      const qtdPedidosPeriodo = periodData.qtdPedidosPeriodo;
      const ticketMedioPeriodo = qtdPedidosPeriodo > 0 ? totalVendasPeriodo / qtdPedidosPeriodo : 0;

      return {
        clienteId: c.id,
        razaoSocial: c.razaoSocial,
        cnpjCpf: c.cnpjCpf,
        totalVendasPeriodo: Number(totalVendasPeriodo.toFixed(2)),
        qtdPedidosPeriodo,
        ticketMedioPeriodo: Number(ticketMedioPeriodo.toFixed(2)),
        ltvHistorico: Number(ltvHistorico.toFixed(2)),
      };
    });

    // Sort by sales in the selected period (descending), then by LTV (descending)
    reportData.sort((a, b) => {
      if (b.totalVendasPeriodo !== a.totalVendasPeriodo) {
        return b.totalVendasPeriodo - a.totalVendasPeriodo;
      }
      return b.ltvHistorico - a.ltvHistorico;
    });

    return NextResponse.json(reportData);
  } catch (error) {
    console.error("GET /api/relatorios/vendas-cliente", error);
    return NextResponse.json({ error: "Erro ao buscar vendas por cliente." }, { status: 500 });
  }
}
