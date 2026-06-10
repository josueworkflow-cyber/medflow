import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthActor, assertPerfil } from "@/lib/authz";
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

    // Grouping actual payments from HistoricoPagamento in the database
    // only for accounts of type RECEBER (receitas)
    const pagamentosAgrupados = await prisma.historicoPagamento.groupBy({
      by: ["formaPagamento"],
      where: {
        data: { gte: start, lte: end },
        conta: {
          tipo: "RECEBER",
        },
      },
      _sum: {
        valor: true,
      },
      _count: {
        id: true,
      },
    });

    const totalRecebido = pagamentosAgrupados.reduce(
      (sum, item) => sum + (item._sum.valor || 0),
      0
    );

    const formas = pagamentosAgrupados
      .map((item) => {
        const valor = item._sum.valor || 0;
        const percentual = totalRecebido > 0 ? Number(((valor / totalRecebido) * 100).toFixed(1)) : 0;
        
        return {
          // Obs 2: Treat null formaPagamento as "NAO_INFORMADO"
          formaPagamento: item.formaPagamento ?? "NAO_INFORMADO",
          valor: Number(valor.toFixed(2)),
          qtdTransacoes: item._count.id,
          percentual,
        };
      })
      .sort((a, b) => b.valor - a.valor);

    return NextResponse.json({
      periodo: {
        inicio: start.toISOString().split("T")[0],
        fim: end.toISOString().split("T")[0],
      },
      totalRecebido: Number(totalRecebido.toFixed(2)),
      formas,
    });
  } catch (error) {
    console.error("GET /api/relatorios/formas-pagamento", error);
    return NextResponse.json({ error: "Erro ao carregar formas de pagamento." }, { status: 500 });
  }
}
