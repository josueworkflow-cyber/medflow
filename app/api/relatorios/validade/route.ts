import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthActor, assertPerfil } from "@/lib/authz";

export async function GET() {
  const actor = await getAuthActor();
  if (!actor) return NextResponse.json({ error: "Nao autorizado." }, { status: 401 });
  try {
    assertPerfil(actor, ["ADMINISTRADOR"]);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 403 });
  }
  try {
    const hoje = new Date();
    const em30dias = new Date(hoje.getTime() + 30 * 24 * 60 * 60 * 1000);

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
      valorEmRisco,
      totais: { vencendo: lotesVencendo.length, vencidos: lotesVencidos.length },
    });
  } catch (error) {
    console.error("GET /api/relatorios/validade", error);
    return NextResponse.json({ error: "Erro ao gerar relatorio de validade." }, { status: 500 });
  }
}
