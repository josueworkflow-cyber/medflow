import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthActor, assertPerfil } from "@/lib/authz";
import { parseDateParam } from "@/lib/relatorios/date-helpers";

export async function GET(req: NextRequest) {
  const actor = await getAuthActor();
  if (!actor) return NextResponse.json({ error: "Nao autorizado." }, { status: 401 });

  try {
    // Restrict access to ADMINISTRADOR and ESTOQUE roles
    assertPerfil(actor, ["ADMINISTRADOR", "ESTOQUE"]);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const dataInicioStr = searchParams.get("dataInicio");
    const dataFimStr = searchParams.get("dataFim");

    const start = parseDateParam(dataInicioStr, false);
    const end = parseDateParam(dataFimStr, true);

    // Query 1: Aggregate outputs (SAIDA) grouped by product ID
    const movimentacoesAgrupadas = await prisma.movimentacaoEstoque.groupBy({
      by: ["produtoId"],
      where: {
        tipo: "SAIDA",
        createdAt: { gte: start, lte: end },
      },
      _sum: {
        quantidade: true,
      },
    });

    const totalVolumeSaidas = movimentacoesAgrupadas.reduce(
      (sum, item) => sum + (item._sum.quantidade || 0),
      0
    );

    // Query 2: Fetch details for the matched products
    const productIds = movimentacoesAgrupadas.map((item) => item.produtoId);
    const produtos = await prisma.produto.findMany({
      where: {
        id: { in: productIds },
      },
      select: {
        id: true,
        descricao: true,
        categoria: true,
      },
    });

    const productMap = new Map(
      produtos.map((p) => [p.id, { descricao: p.descricao, categoria: p.categoria || "—" }])
    );

    // Sort products by total quantity of exits descending
    const sortedProducts = movimentacoesAgrupadas
      .map((item) => {
        const prod = productMap.get(item.produtoId) || { descricao: `Produto #${item.produtoId}`, categoria: "—" };
        return {
          produtoId: item.produtoId,
          descricao: prod.descricao,
          categoria: prod.categoria,
          totalSaidas: item._sum.quantidade || 0,
        };
      })
      .sort((a, b) => b.totalSaidas - a.totalSaidas);

    // Compute cumulative percentages and ABC classification
    let runningSum = 0;
    const reportData = sortedProducts.map((p) => {
      const percentualIndividual = totalVolumeSaidas > 0 ? (p.totalSaidas / totalVolumeSaidas) * 100 : 0;
      runningSum += percentualIndividual;

      // Classification boundaries:
      // A = up to 80% of volume
      // B = 80% to 95% of volume
      // C = above 95% of volume
      let classificacao = "C";
      if (runningSum <= 80) {
        classificacao = "A";
      } else if (runningSum <= 95) {
        classificacao = "B";
      }

      return {
        ...p,
        percentualIndividual: Number(percentualIndividual.toFixed(2)),
        percentualAcumulado: Number(runningSum.toFixed(2)),
        classificacao,
      };
    });

    return NextResponse.json(reportData);
  } catch (error) {
    console.error("GET /api/relatorios/curva-abc", error);
    return NextResponse.json({ error: "Erro ao gerar relatorio Curva ABC." }, { status: 500 });
  }
}
