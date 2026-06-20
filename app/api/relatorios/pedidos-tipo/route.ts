import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthActor, assertPerfil } from "@/lib/authz";
import { StatusPedido } from "@prisma/client";
import { parseDateParam } from "@/lib/relatorios/date-helpers";

export async function GET(req: NextRequest) {
  const actor = await getAuthActor();
  if (!actor) return NextResponse.json({ error: "Nao autorizado." }, { status: 401 });

  try {
    // Access restricted to ADMINISTRADOR and FINANCEIRO
    assertPerfil(actor, ["ADMINISTRADOR", "FINANCEIRO"]);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const dataInicioStr = searchParams.get("dataInicio");
    const dataFimStr = searchParams.get("dataFim");

    const start = parseDateParam(dataInicioStr, false);
    const end = parseDateParam(dataFimStr, true);

    // Same valid statuses from sales period report
    const statusValidos: StatusPedido[] = [
      "FATURADO",
      "AUTORIZADO_PARA_SEPARACAO",
      "EM_SEPARACAO",
      "SEPARADO",
      "DESPACHADO",
      "FINALIZADO",
    ];

    // Query PedidoVenda grouped by tipoPedido (aggregates in database)
    const agrupado = await prisma.pedidoVenda.groupBy({
      by: ["tipoPedido"],
      where: {
        status: { in: statusValidos },
        createdAt: { gte: start, lte: end },
      },
      _sum: {
        valorTotal: true,
      },
      _count: {
        id: true,
      },
    });

    let normalQtd = 0;
    let normalValor = 0;
    let internoQtd = 0;
    let internoValor = 0;

    agrupado.forEach((item) => {
      if (item.tipoPedido === "PEDIDO_NORMAL") {
        normalQtd = item._count.id;
        normalValor = item._sum.valorTotal || 0;
      } else if (item.tipoPedido === "PEDIDO_INTERNO") {
        internoQtd = item._count.id;
        internoValor = item._sum.valorTotal || 0;
      }
    });

    const totalQtd = normalQtd + internoQtd;
    const totalValor = normalValor + internoValor;

    const percentualNormal = totalQtd > 0 ? (normalQtd / totalQtd) * 100 : 0;
    const percentualInterno = totalQtd > 0 ? (internoQtd / totalQtd) * 100 : 0;

    return NextResponse.json({
      periodo: {
        inicio: start.toISOString().split("T")[0],
        fim: end.toISOString().split("T")[0],
      },
      normal: {
        qtd: normalQtd,
        valorTotal: Number(normalValor.toFixed(2)),
        percentual: Number(percentualNormal.toFixed(1)),
      },
      interno: {
        qtd: internoQtd,
        valorTotal: Number(internoValor.toFixed(2)),
        percentual: Number(percentualInterno.toFixed(1)),
      },
      total: {
        qtd: totalQtd,
        valorTotal: Number(totalValor.toFixed(2)),
      },
    });
  } catch (error) {
    console.error("GET /api/relatorios/pedidos-tipo", error);
    return NextResponse.json({ error: "Erro ao gerar relatorio de pedidos por tipo." }, { status: 500 });
  }
}
