import { NextRequest, NextResponse } from "next/server";
import { PedidoService } from "@/lib/services/pedido.service";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { acao, dados, usuarioId } = body;

    const pedidoId = Number(id);
    let result;

    switch (acao) {
      case "reservar":
        result = await PedidoService.reservarPedido(pedidoId, usuarioId);
        break;
      case "enviar_financeiro":
        result = await PedidoService.enviarParaFinanceiro(pedidoId, usuarioId);
        break;
      case "aprovar":
        result = await PedidoService.aprovarFinanceiro(pedidoId, usuarioId);
        break;
      case "reprovar":
        result = await PedidoService.reprovarFinanceiro(pedidoId, usuarioId, dados?.observacao);
        break;
      case "iniciar_separacao":
        result = await PedidoService.iniciarSeparacao(pedidoId, usuarioId);
        break;
      case "finalizar_separacao":
        result = await PedidoService.finalizarSeparacao(pedidoId, usuarioId);
        break;
      case "faturar":
        result = await PedidoService.faturarPedido(pedidoId, usuarioId, dados);
        break;
      case "despachar":
        result = await PedidoService.despacharPedido(pedidoId, usuarioId, dados);
        break;
      case "confirmar_entrega":
        result = await PedidoService.confirmarEntrega(pedidoId, usuarioId);
        break;
      case "finalizar":
        result = await PedidoService.finalizarPedido(pedidoId, usuarioId);
        break;
      case "cancelar":
        result = await PedidoService.cancelarPedido(pedidoId, usuarioId, dados?.observacao);
        break;
      default:
        return NextResponse.json({ error: "Ação inválida." }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("POST /api/vendas/[id]/transicao", error);
    return NextResponse.json({ error: error.message || "Erro ao processar transição." }, { status: 500 });
  }
}
