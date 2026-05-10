import { NextRequest, NextResponse } from "next/server";
import { EstoqueService } from "@/lib/services/estoque.service";
import { getAuthActor, assertPerfil } from "@/lib/authz";

export async function POST(req: NextRequest) {
  const actor = await getAuthActor();
  if (!actor) return NextResponse.json({ error: "Nao autorizado." }, { status: 401 });
  try {
    assertPerfil(actor, ["ESTOQUE"]);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 403 });
  }
  try {
    const body = await req.json();
    const { produtoId, loteId, quantidade, pedidoVendaId, usuarioId } = body;

    const result = await EstoqueService.registrarReserva({
      produtoId: Number(produtoId),
      loteId: loteId ? Number(loteId) : undefined,
      quantidade: Number(quantidade),
      pedidoVendaId: Number(pedidoVendaId),
      usuarioId: usuarioId ? Number(usuarioId) : undefined
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
