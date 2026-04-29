import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const movimentacoes = await prisma.movimentacaoEstoque.findMany({
      include: {
        produto: { select: { descricao: true, codigoInterno: true } },
        lote: { select: { numeroLote: true, validade: true } },
        localizacao: { select: { nome: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    return NextResponse.json(movimentacoes);
  } catch (error) {
    console.error("GET /api/estoque/movimentacoes", error);
    return NextResponse.json({ error: "Erro ao buscar movimentações." }, { status: 500 });
  }
}
