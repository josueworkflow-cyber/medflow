import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthActor, assertPerfil } from "@/lib/authz";
import { StatusPedido } from "@prisma/client";
import { parseDateParam } from "@/lib/relatorios/date-helpers";


export async function GET(req: NextRequest) {
  const actor = await getAuthActor();
  if (!actor) return NextResponse.json({ error: "Nao autorizado." }, { status: 401 });
  
  try {
    // Allow both administrators and sales personnel to view sales reports
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
     * - "FATURADO": Order has been billed/invoiced.
     * - "AUTORIZADO_PARA_SEPARACAO": Order approved for fulfillment.
     * - "EM_SEPARACAO": Currently in picking stage.
     * - "SEPARADO": Order items picked and packed.
     * - "DESPACHADO": Shipped to customer.
     * - "FINALIZADO": Order completely closed.
     * 
     * We EXCLUDE the following statuses:
     * - "PEDIDO_CRIADO": Draft/new order. Not confirmed yet.
     * - "AGUARDANDO_ESTOQUE", "ESTOQUE_PARCIAL", "ESTOQUE_INDISPONIVEL", "AGUARDANDO_FORNECEDOR": Pending stock availability.
     * - "AGUARDANDO_APROVACAO_FINANCEIRA", "REPROVADO_FINANCEIRO", "PAGAMENTO_PENDENTE": Financial check not cleared.
     * - "CONDICAO_COMERCIAL_PENDENTE", "AGUARDANDO_CONFIRMACAO_CLIENTE", "CLIENTE_CONFIRMOU", "PEDIDO_EM_REVISAO": Negotiation/review.
     * - "AGUARDANDO_FATURAMENTO": Confirmed but not yet officially billed (pre-sale phase).
     * - "CANCELADO", "CANCELADO_PELO_CLIENTE": Orders that were rejected/cancelled. Excluded because they do not represent real revenue.
     */
    const statusValidos: StatusPedido[] = [
      "FATURADO",
      "AUTORIZADO_PARA_SEPARACAO",
      "EM_SEPARACAO",
      "SEPARADO",
      "DESPACHADO",
      "FINALIZADO",
    ];

    const pedidos = await prisma.pedidoVenda.findMany({
      where: {
        tipoPedido: "PEDIDO_NORMAL",
        status: { in: statusValidos },
        createdAt: { gte: start, lte: end },
      },
      select: {
        createdAt: true,
        valorTotal: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    const faturamentoTotal = pedidos.reduce((sum, p) => sum + p.valorTotal, 0);
    const qtdPedidos = pedidos.length;
    const ticketMedio = qtdPedidos > 0 ? faturamentoTotal / qtdPedidos : 0;

    // Calculate duration in days to apply auto-grouping rules
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    let formatKey: (d: Date) => string;

    if (diffDays <= 60) {
      // Group by day (YYYY-MM-DD)
      formatKey = (d: Date) => {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
      };
    } else if (diffDays <= 180) {
      // Group by week ("Semana de DD/MM/YYYY" referring to the Monday of that week)
      formatKey = (d: Date) => {
        const dayOfWeek = d.getDay();
        const distanceToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        const monday = new Date(d);
        monday.setDate(d.getDate() + distanceToMonday);
        const year = monday.getFullYear();
        const month = String(monday.getMonth() + 1).padStart(2, "0");
        const day = String(monday.getDate()).padStart(2, "0");
        return `Semana de ${day}/${month}/${year}`;
      };
    } else {
      // Group by month ("Mes/YYYY")
      const meses = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
      formatKey = (d: Date) => {
        const year = d.getFullYear();
        const month = meses[d.getMonth()];
        return `${month}/${year}`;
      };
    }

    const agrupado: Record<string, { faturamento: number; qtdPedidos: number }> = {};

    pedidos.forEach((p) => {
      const key = formatKey(p.createdAt);
      if (!agrupado[key]) {
        agrupado[key] = { faturamento: 0, qtdPedidos: 0 };
      }
      agrupado[key].faturamento += p.valorTotal;
      agrupado[key].qtdPedidos += 1;
    });

    const diario = Object.entries(agrupado).map(([data, info]) => ({
      data,
      faturamento: Number(info.faturamento.toFixed(2)),
      qtdPedidos: info.qtdPedidos,
    }));

    return NextResponse.json({
      resumo: {
        faturamentoTotal: Number(faturamentoTotal.toFixed(2)),
        qtdPedidos,
        ticketMedio: Number(ticketMedio.toFixed(2)),
      },
      periodo: {
        inicio: start.toISOString(),
        fim: end.toISOString(),
      },
      diario,
    });
  } catch (error) {
    console.error("GET /api/relatorios/vendas-periodo", error);
    return NextResponse.json({ error: "Erro ao buscar vendas por periodo." }, { status: 500 });
  }
}
