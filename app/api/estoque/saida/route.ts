import { NextRequest, NextResponse } from "next/server";
import { EstoqueService } from "@/lib/services/estoque.service";

export async function POST(req: NextRequest) {
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
