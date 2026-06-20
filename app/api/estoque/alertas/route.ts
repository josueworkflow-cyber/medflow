import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthActor, assertPerfil } from "@/lib/authz";

export async function GET(req: NextRequest) {
  const actor = await getAuthActor();
  if (!actor) return NextResponse.json({ error: "Nao autorizado." }, { status: 401 });
  
  try {
    assertPerfil(actor, ["ESTOQUE"]);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 403 });
  }

  try {
    const searchParams = req.nextUrl.searchParams;
    const diasParam = searchParams.get("dias") || "30";
    const dias = parseInt(diasParam, 10);

    if (dias !== 30 && dias !== 60 && dias !== 90) {
      return NextResponse.json({ error: "Parâmetro dias inválido. Deve ser 30, 60 ou 90." }, { status: 400 });
    }

    const hoje = new Date();
    const emNdias = new Date(hoje.getTime() + dias * 24 * 60 * 60 * 1000);

    // Alertas de vencimento
    const lotesVencendo = await prisma.lote.findMany({
      where: {
        validade: { gte: hoje, lte: emNdias },
        estoqueAtual: { some: { quantidadeDisponivel: { gt: 0 } } },
      },
      include: {
        produto: { select: { descricao: true, codigoInterno: true } },
        estoqueAtual: { select: { quantidadeDisponivel: true } },
        localizacaoRef: { select: { nome: true } },
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
        localizacaoRef: { select: { nome: true } },
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
          categoria: p.categoria,
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
        localizacao: l.localizacaoRef?.nome || "Não informada",
      })),
      vencidos: lotesVencidos.map((l) => ({
        loteId: l.id,
        numeroLote: l.numeroLote,
        validade: l.validade,
        produto: l.produto?.descricao,
        codigo: l.produto?.codigoInterno,
        quantidade: l.estoqueAtual.reduce((s, e) => s + e.quantidadeDisponivel, 0),
        localizacao: l.localizacaoRef?.nome || "Não informada",
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
