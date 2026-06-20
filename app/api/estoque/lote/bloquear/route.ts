import { NextRequest, NextResponse } from "next/server";
import { getAuthActor, assertPerfil } from "@/lib/authz";
import { EstoqueService } from "@/lib/services/estoque.service";

export async function POST(req: NextRequest) {
  const actor = await getAuthActor();
  if (!actor) return NextResponse.json({ error: "Nao autorizado." }, { status: 401 });
  
  try {
    assertPerfil(actor, ["ESTOQUE"]);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 403 });
  }

  try {
    const { loteId, status, motivo } = await req.json();
    if (!loteId || !status || !motivo) {
      return NextResponse.json({ error: "Campos loteId, status e motivo são obrigatórios." }, { status: 400 });
    }

    if (status !== "QUARENTENA" && status !== "BLOQUEADO") {
      return NextResponse.json({ error: "Status inválido para bloqueio." }, { status: 400 });
    }

    await EstoqueService.bloquearLote({
      loteId: Number(loteId),
      status,
      motivo,
      usuarioId: actor.usuarioId
    });

    return NextResponse.json({ success: true, message: `Lote colocado em ${status} com sucesso.` });
  } catch (error: any) {
    console.error("POST /api/estoque/lote/bloquear", error);
    return NextResponse.json({ error: error.message || "Erro ao bloquear lote." }, { status: 500 });
  }
}
