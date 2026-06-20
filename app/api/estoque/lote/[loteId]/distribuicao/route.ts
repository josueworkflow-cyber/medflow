import { NextRequest, NextResponse } from "next/server";
import { MapaDistribuicaoService } from "@/lib/services/estoque/mapa-distribuicao.service";
import { getAuthActor, assertPerfil } from "@/lib/authz";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ loteId: string }> }
) {
  const actor = await getAuthActor();
  if (!actor) {
    return NextResponse.json({ error: "Nao autorizado." }, { status: 401 });
  }

  try {
    // Permissão: ESTOQUE, FINANCEIRO e ADMINISTRADOR (assertPerfil permite ADMINISTRADOR automaticamente)
    assertPerfil(actor, ["ESTOQUE", "FINANCEIRO"]);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 403 });
  }

  try {
    const { loteId } = await params;
    const id = Number(loteId);
    if (isNaN(id)) {
      return NextResponse.json({ error: "ID do lote inválido." }, { status: 400 });
    }

    const data = await MapaDistribuicaoService.getMapaDistribuicao(id);
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("GET /api/estoque/lote/[loteId]/distribuicao", error);
    if (error.message === "Lote não encontrado") {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    return NextResponse.json({ error: "Erro ao buscar mapa de distribuição." }, { status: 500 });
  }
}
