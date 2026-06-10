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

    // DRE Lógica:
    // Obs 1: Usar o campo `valor` da Conta (valor original da conta), não `valorPago`.
    // Para o DRE o valor correto é o valor original da conta paga, não o que foi parcialmente baixado.
    
    // 1. Receita Bruta (RECEBER, status PAGA, dataPagamento no período)
    const receitaBrutaQuery = await prisma.conta.aggregate({
      where: {
        tipo: "RECEBER",
        status: "PAGA",
        dataPagamento: { gte: start, lte: end },
      },
      _sum: {
        valor: true,
      },
    });
    const receitaBruta = receitaBrutaQuery._sum.valor || 0;

    // 2. Deduções/Despesas (PAGAR, status PAGA, dataPagamento no período)
    const totalDespesasQuery = await prisma.conta.aggregate({
      where: {
        tipo: "PAGAR",
        status: "PAGA",
        dataPagamento: { gte: start, lte: end },
      },
      _sum: {
        valor: true,
      },
    });
    const totalDespesas = totalDespesasQuery._sum.valor || 0;

    const resultado = receitaBruta - totalDespesas;

    // 3. Breakdown por formaPagamento para receitas (RECEBER)
    const receitasPorFormaPagamentoQuery = await prisma.conta.groupBy({
      by: ["formaPagamento"],
      where: {
        tipo: "RECEBER",
        status: "PAGA",
        dataPagamento: { gte: start, lte: end },
      },
      _sum: {
        valor: true,
      },
    });

    const receitasPorFormaPagamento = receitasPorFormaPagamentoQuery
      .map((item) => ({
        formaPagamento: item.formaPagamento || "NAO_INFORMADO",
        valor: Number((item._sum.valor || 0).toFixed(2)),
      }))
      .sort((a, b) => b.valor - a.valor);

    // 4. Breakdown por categoria para despesas (PAGAR)
    const despesasPorCategoriaQuery = await prisma.conta.groupBy({
      by: ["categoria"],
      where: {
        tipo: "PAGAR",
        status: "PAGA",
        dataPagamento: { gte: start, lte: end },
      },
      _sum: {
        valor: true,
      },
    });

    const despesasPorCategoria = despesasPorCategoriaQuery
      .map((item) => ({
        categoria: item.categoria || "Nao especificado",
        valor: Number((item._sum.valor || 0).toFixed(2)),
      }))
      .sort((a, b) => b.valor - a.valor);

    return NextResponse.json({
      periodo: {
        inicio: start.toISOString().split("T")[0],
        fim: end.toISOString().split("T")[0],
      },
      receitaBruta: Number(receitaBruta.toFixed(2)),
      totalDespesas: Number(totalDespesas.toFixed(2)),
      resultado: Number(resultado.toFixed(2)),
      receitasPorFormaPagamento,
      despesasPorCategoria,
    });
  } catch (error) {
    console.error("GET /api/relatorios/dre", error);
    return NextResponse.json({ error: "Erro ao gerar relatorio DRE." }, { status: 500 });
  }
}
