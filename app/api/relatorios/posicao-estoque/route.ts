import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthActor, assertPerfil } from "@/lib/authz";

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
    // Single database hit: Fetch all active products including their current stock mappings (prevents N+1 queries)
    const produtos = await prisma.produto.findMany({
      where: {
        ativo: true,
      },
      include: {
        estoqueAtual: true,
      },
    });

    const reportData = produtos.map((p) => {
      let totalDisponivel = 0;
      let totalReservado = 0;
      let totalBloqueado = 0;
      let valorDisponivelCusto = 0;

      p.estoqueAtual.forEach((e) => {
        totalDisponivel += e.quantidadeDisponivel;
        totalReservado += e.quantidadeReservada;
        totalBloqueado += e.quantidadeBloqueada;

        // Cumulative cost evaluation based on available inventory quantity
        valorDisponivelCusto += e.quantidadeDisponivel * e.custoUnitario;
      });

      const total = totalDisponivel + totalReservado + totalBloqueado;

      // EXPLICIT COST CALCULATION (AS REQUESTED IN OBS 1):
      // custoUnitario = sum(custoUnitario * quantidadeDisponivel) / sum(quantidadeDisponivel)
      // Falls back to precoCustoBase from the product definition if totalDisponivel is 0.
      const custoUnitario = totalDisponivel > 0
        ? valorDisponivelCusto / totalDisponivel
        : p.precoCustoBase;

      // valorTotalEstoque = (disponivel + reservado) * custoUnitario
      const valorTotalEstoque = (totalDisponivel + totalReservado) * custoUnitario;

      return {
        produtoId: p.id,
        descricao: p.descricao,
        categoria: p.categoria || "—",
        codigoInterno: p.codigoInterno || "—",
        disponivel: Number(totalDisponivel.toFixed(2)),
        reservado: Number(totalReservado.toFixed(2)),
        bloqueado: Number(totalBloqueado.toFixed(2)),
        total: Number(total.toFixed(2)),
        estoqueMinimo: p.estoqueMinimo,
        abaixoMinimo: totalDisponivel < p.estoqueMinimo,
        custoUnitario: Number(custoUnitario.toFixed(2)),
        valorTotalEstoque: Number(valorTotalEstoque.toFixed(2)),
      };
    });

    // Filter out products with no stock and no minimum limit to avoid cluttering the report
    const filteredReportData = reportData.filter((p) => p.total > 0 || p.estoqueMinimo > 0);

    // Sort products alphabetically by description
    filteredReportData.sort((a, b) => a.descricao.localeCompare(b.descricao));

    return NextResponse.json(filteredReportData);
  } catch (error) {
    console.error("GET /api/relatorios/posicao-estoque", error);
    return NextResponse.json({ error: "Erro ao carregar posicao do estoque." }, { status: 500 });
  }
}
