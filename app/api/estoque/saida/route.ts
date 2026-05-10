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
    const {
      pedidoVendaId,
      clienteId,
      empresaFiscalId,
      documentoFiscalId,
      itens,
      usuarioId
    } = body;

    if (!pedidoVendaId || !clienteId || !empresaFiscalId || !documentoFiscalId || !itens?.length) {
      return NextResponse.json({ error: "Dados fiscais e itens são obrigatórios para faturamento" }, { status: 400 });
    }

    const result = await EstoqueService.registrarSaidaFaturamento({
      pedidoVendaId: Number(pedidoVendaId),
      clienteId: Number(clienteId),
      empresaFiscalId: Number(empresaFiscalId),
      documentoFiscalId: Number(documentoFiscalId),
      itens: itens.map((i: any) => ({
        produtoId: Number(i.produtoId),
        loteId: i.loteId ? Number(i.loteId) : undefined,
        quantidade: Number(i.quantidade),
        valorTotal: Number(i.valorTotal)
      })),
      usuarioId: usuarioId ? Number(usuarioId) : undefined
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message || "Erro no faturamento" }, { status: 500 });
  }
}
