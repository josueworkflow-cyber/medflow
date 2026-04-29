import { NextRequest, NextResponse } from "next/server";
import { EstoqueService } from "@/lib/services/estoque.service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { movimentacaoReservaId, usuarioId } = body;

    const result = await EstoqueService.cancelarReserva({
      movimentacaoReservaId: Number(movimentacaoReservaId),
      usuarioId: usuarioId ? Number(usuarioId) : undefined
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
