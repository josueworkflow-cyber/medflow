import { NextRequest, NextResponse } from "next/server";
import { EstoqueService } from "@/lib/services/estoque.service";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ produtoId: string }> }
) {
  try {
    const { produtoId } = await params;
    const { searchParams } = new URL(req.url);
    const loteId = searchParams.get('loteId');

    const historico = await EstoqueService.getHistorico(
      Number(produtoId),
      loteId ? Number(loteId) : undefined
    );

    return NextResponse.json(historico);
  } catch (error) {
    return NextResponse.json({ error: "Erro ao buscar histórico" }, { status: 500 });
  }
}
