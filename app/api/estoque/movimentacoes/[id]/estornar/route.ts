import { NextRequest, NextResponse } from "next/server";
import { getAuthActor, assertPerfil } from "@/lib/authz";
import { EstoqueService } from "@/lib/services/estoque.service";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const actor = await getAuthActor();
  if (!actor) return NextResponse.json({ error: "Nao autorizado." }, { status: 401 });
  try {
    assertPerfil(actor, ["ESTOQUE"]);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 403 });
  }

  try {
    const { id } = await params;
    const movimentacaoId = Number(id);

    if (isNaN(movimentacaoId)) {
      return NextResponse.json({ error: "ID de movimentação inválido." }, { status: 400 });
    }

    const estornoMov = await EstoqueService.estornarEntrada(movimentacaoId, actor.usuarioId);

    return NextResponse.json({ success: true, movimentacao: estornoMov });
  } catch (error: any) {
    console.error("POST /api/estoque/movimentacoes/[id]/estornar", error);
    return NextResponse.json(
      { error: error.message || "Erro ao estornar a entrada de estoque." },
      { status: 500 }
    );
  }
}
