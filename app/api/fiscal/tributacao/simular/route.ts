import { NextRequest, NextResponse } from "next/server";
import { assertPerfil, getAuthActor } from "@/lib/authz";
import { calculateOrderTaxes } from "@/lib/services/fiscal/tributario/tax-engine.service";

export async function POST(req: NextRequest) {
  const actor = await getAuthActor();
  if (!actor) return NextResponse.json({ error: "Nao autorizado." }, { status: 401 });
  try {
    assertPerfil(actor, ["FINANCEIRO"]);
    const body = await req.json();
    const pedidoVendaId = Number(body.pedidoVendaId);
    const empresaFiscalId = Number(body.empresaFiscalId);
    const naturezaOperacaoId = Number(body.naturezaOperacaoId);
    if (![pedidoVendaId, empresaFiscalId, naturezaOperacaoId].every(Number.isInteger)) {
      return NextResponse.json({ error: "Pedido, empresa e natureza sao obrigatorios." }, { status: 400 });
    }
    const result = await calculateOrderTaxes({
      pedidoVendaId,
      empresaFiscalId,
      naturezaOperacaoId,
      cliente: body.cliente ? {
        estado: body.cliente.estado,
        contribuinteICMS: Boolean(body.cliente.contribuinteICMS),
        consumidorFinal: Boolean(body.cliente.consumidorFinal),
      } : undefined,
    });
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Erro no calculo tributario." }, { status: 400 });
  }
}
