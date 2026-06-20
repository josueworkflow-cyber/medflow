import { NextRequest, NextResponse } from "next/server";
import { EstoqueService } from "@/lib/services/estoque.service";
import { getAuthActor, assertPerfil } from "@/lib/authz";

export async function PATCH(
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
    const movId = Number(id);
    if (isNaN(movId)) {
      return NextResponse.json({ error: "ID de movimentação inválido." }, { status: 400 });
    }

    const body = await req.json();
    const { motivo } = body;

    if (!motivo || typeof motivo !== "string" || motivo.trim().length < 5) {
      return NextResponse.json(
        { error: "Informe um motivo para a alteração (mínimo 5 caracteres)." },
        { status: 400 }
      );
    }

    const data = {
      quantidade: body.quantidade !== undefined ? Number(body.quantidade) : undefined,
      observacao: body.observacao !== undefined ? (body.observacao || null) : undefined,
      origem: body.origem !== undefined ? (body.origem || null) : undefined,
    };

    const mov = await EstoqueService.editarMovimentacaoEntrada(movId, data, motivo, actor.usuarioId);

    return NextResponse.json(mov);
  } catch (error: any) {
    console.error("PATCH /api/estoque/movimentacoes/[id]", error);
    return NextResponse.json(
      { error: error.message || "Erro ao atualizar movimentação." },
      { status: 500 }
    );
  }
}
