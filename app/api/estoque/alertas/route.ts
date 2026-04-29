import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const hoje = new Date();
    const em30dias = new Date(hoje.getTime() + 30 * 24 * 60 * 60 * 1000);

    // Alertas de vencimento
    const lotesVencendo = await prisma.lote.findMany({
      where: {
        validade: { gte: hoje, lte: em30dias },
        estoqueAtual: { some: { quantidadeDisponivel: { gt: 0 } } },
      },
      include: {
        produto: { select: { descricao: true, codigoInterno: true } },
        estoqueAtual: { select: { quantidadeDisponivel: true } },
      },
    });

    const lotesVencidos = await prisma.lote.findMany({
      where: {
        validade: { lt: hoje },
        estoqueAtual: { some: { quantidadeDisponivel: { gt: 0 } } },
      },
      include: {
        produto: { select: { descricao: true, codigoInterno: true, precoCustoBase: true } },
        estoqueAtual: { select: { quantidadeDisponivel: true } },
      },
    });

    // Alertas estoque mínimo
    const produtosComEstoque = await prisma.produto.findMany({
      where: { ativo: true, estoqueMinimo: { gt: 0 } },
      include: {
        estoqueAtual: {
          select: { quantidadeDisponivel: true },
        },
      },
    });

    const abaixoMinimo = produtosComEstoque
      .map((p) => {
        const estoqueDisponivel = p.estoqueAtual.reduce(
          (sum, e) => sum + e.quantidadeDisponivel,
          0
        );
        return {
          id: p.id,
          descricao: p.descricao,
          codigoInterno: p.codigoInterno,
          estoqueMinimo: p.estoqueMinimo,
          estoqueAtual: estoqueDisponivel,
          diferenca: estoqueDisponivel - p.estoqueMinimo,
        };
      })
      .filter((p) => p.estoqueAtual < p.estoqueMinimo);

    // Valor em risco (produtos vencidos)
    const valorEmRisco = lotesVencidos.reduce((sum, lote) => {
      const qtd = lote.estoqueAtual.reduce((s, e) => s + e.quantidadeDisponivel, 0);
      return sum + qtd * (lote.produto?.precoCustoBase || 0);
    }, 0);

    return NextResponse.json({
      vencendo: lotesVencendo.map((l) => ({
        loteId: l.id,
        numeroLote: l.numeroLote,
        validade: l.validade,
        produto: l.produto?.descricao,
        codigo: l.produto?.codigoInterno,
        quantidade: l.estoqueAtual.reduce((s, e) => s + e.quantidadeDisponivel, 0),
      })),
      vencidos: lotesVencidos.map((l) => ({
        loteId: l.id,
        numeroLote: l.numeroLote,
        validade: l.validade,
        produto: l.produto?.descricao,
        codigo: l.produto?.codigoInterno,
        quantidade: l.estoqueAtual.reduce((s, e) => s + e.quantidadeDisponivel, 0),
      })),
      abaixoMinimo,
      valorEmRisco,
      totais: {
        vencendo: lotesVencendo.length,
        vencidos: lotesVencidos.length,
        abaixoMinimo: abaixoMinimo.length,
      },
    });
  } catch (error) {
    console.error("GET /api/estoque/alertas", error);
    return NextResponse.json({ error: "Erro ao gerar alertas." }, { status: 500 });
  }
}
