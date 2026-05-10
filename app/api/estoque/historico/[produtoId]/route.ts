import { NextRequest, NextResponse } from "next/server";
import { EstoqueService } from "@/lib/services/estoque.service";
import { getAuthActor, assertPerfil } from "@/lib/authz";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ produtoId: string }> }
) {
  const actor = await getAuthActor();
  if (!actor) return NextResponse.json({ error: "Nao autorizado." }, { status: 401 });
  try {
    assertPerfil(actor, ["ESTOQUE"]);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 403 });
  }
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
