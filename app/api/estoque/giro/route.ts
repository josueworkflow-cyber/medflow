import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // Calcular giro de estoque para cada produto
    // giro = vendas dos últimos 30 dias / estoque atual
    const hoje = new Date();
    const ha30dias = new Date(hoje.getTime() - 30 * 24 * 60 * 60 * 1000);

    const produtos = await prisma.produto.findMany({
      where: { ativo: true },
      include: {
        estoqueAtual: { select: { quantidadeDisponivel: true } },
      },
    });

    // Vendas por produto nos últimos 30 dias
    const vendasRecentes = await prisma.movimentacaoEstoque.groupBy({
      by: ["produtoId"],
      where: {
        tipo: "SAIDA",
        createdAt: { gte: ha30dias },
      },
      _sum: { quantidade: true },
    });

    const vendasMap = new Map(
      vendasRecentes.map((v) => [v.produtoId, v._sum.quantidade || 0])
    );

    const giro = produtos
      .map((p) => {
        const estoqueDisponivel = p.estoqueAtual.reduce(
          (s, e) => s + e.quantidadeDisponivel,
          0
        );
        const vendaMensal = vendasMap.get(p.id) || 0;
        const diasCobertura =
          vendaMensal > 0 ? Math.round((estoqueDisponivel / vendaMensal) * 30) : estoqueDisponivel > 0 ? 999 : 0;

        return {
          id: p.id,
          codigoInterno: p.codigoInterno,
          descricao: p.descricao,
          estoqueAtual: estoqueDisponivel,
          vendaMensal,
          diasCobertura,
          status:
            diasCobertura === 0
              ? "SEM_ESTOQUE"
              : diasCobertura <= 7
                ? "CRITICO"
                : diasCobertura <= 30
                  ? "BAIXO"
                  : diasCobertura <= 90
                    ? "NORMAL"
                    : "EXCESSO",
        };
      })
      .filter((p) => p.estoqueAtual > 0 || p.vendaMensal > 0)
      .sort((a, b) => a.diasCobertura - b.diasCobertura);

    return NextResponse.json(giro);
  } catch (error) {
    console.error("GET /api/estoque/giro", error);
    return NextResponse.json({ error: "Erro ao calcular giro." }, { status: 500 });
  }
}
