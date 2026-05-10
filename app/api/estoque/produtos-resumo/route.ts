import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthActor, assertPerfil } from "@/lib/authz";

export async function GET() {
  const actor = await getAuthActor();
  if (!actor) return NextResponse.json({ error: "Nao autorizado." }, { status: 401 });
  try {
    assertPerfil(actor, ["ESTOQUE"]);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 403 });
  }
  try {
    const produtos = await prisma.produto.findMany({
      where: { ativo: true },
      include: {
        categoriaRef: { select: { nome: true } },
        estoqueAtual: { select: { quantidadeDisponivel: true, quantidadeReservada: true } },
      },
      orderBy: { descricao: "asc" },
    });

    const resumo = produtos.map((p) => {
      const qtdDisponivel = p.estoqueAtual.reduce((s, e) => s + e.quantidadeDisponivel, 0);
      const qtdReservada = p.estoqueAtual.reduce((s, e) => s + e.quantidadeReservada, 0);
      const qtdTotal = qtdDisponivel + qtdReservada;
      const estoqueMinimo = p.estoqueMinimo || 0;
      const percentual = estoqueMinimo > 0 ? Math.min((qtdTotal / estoqueMinimo) * 100, 100) : 100;

      let status: "OK" | "CRITICO" | "ESGOTADO" = "OK";
      if (qtdTotal === 0) status = "ESGOTADO";
      else if (estoqueMinimo > 0 && qtdTotal < estoqueMinimo * 0.2) status = "CRITICO";
      else if (estoqueMinimo > 0 && qtdTotal < estoqueMinimo) status = "CRITICO";

      return {
        id: p.id,
        codigoInterno: p.codigoInterno,
        descricao: p.descricao,
        categoria: p.categoriaRef?.nome || p.categoria || "Sem categoria",
        qtdDisponivel,
        qtdReservada,
        qtdTotal,
        estoqueMinimo,
        percentual,
        status,
      };
    });

    const kpis = {
      totalSKUs: resumo.length,
      totalItens: resumo.reduce((s, p) => s + p.qtdTotal, 0),
      criticos: resumo.filter((p) => p.status === "CRITICO").length,
      esgotados: resumo.filter((p) => p.status === "ESGOTADO").length,
    };

    return NextResponse.json({ produtos: resumo, kpis });
  } catch (error) {
    console.error("GET /api/estoque/produtos-resumo", error);
    return NextResponse.json({ error: "Erro ao buscar resumo." }, { status: 500 });
  }
}
