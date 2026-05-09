import { NextRequest, NextResponse } from "next/server";
import { PedidoService } from "@/lib/services/pedido.service";
import { requireAuthActor } from "@/lib/authz";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { acao, dados } = await req.json();
    const actor = await requireAuthActor();
    const pedidoId = Number(id);
    let result;

    switch (acao) {
      case "verificar_estoque":
        result = await PedidoService.verificarEstoque(pedidoId, actor);
        break;
      case "confirmar_estoque":
      case "reservar":
        result = await PedidoService.confirmarEstoque(pedidoId, actor);
        break;
      case "aguardar_fornecedor":
        result = await PedidoService.aguardarFornecedor(pedidoId, actor, dados?.observacao);
        break;
      case "aprovar":
        result = await PedidoService.aprovarFinanceiro(pedidoId, actor);
        break;
      case "reprovar":
        result = await PedidoService.reprovarFinanceiro(pedidoId, actor, dados?.observacao);
        break;
      case "pagamento_pendente":
        result = await PedidoService.marcarPagamentoPendente(pedidoId, actor, dados?.observacao);
        break;
      case "condicao_pendente":
        result = await PedidoService.marcarCondicaoComercialPendente(pedidoId, actor, dados?.observacao);
        break;
      case "cliente_confirmou":
        result = await PedidoService.clienteConfirmou(pedidoId, actor);
        break;
      case "cliente_recusou":
        result = await PedidoService.clienteRecusou(pedidoId, actor, dados?.observacao);
        break;
      case "pedido_em_revisao":
        result = await PedidoService.pedidoEmRevisao(pedidoId, actor, dados?.observacao);
        break;
      case "reiniciar_revisao":
        result = await PedidoService.reiniciarFluxoAposRevisao(pedidoId, actor);
        break;
      case "faturar":
        result = await PedidoService.faturarPedido(pedidoId, actor, dados);
        break;
      case "autorizar_interno":
        result = await PedidoService.autorizarPedidoInterno(pedidoId, actor);
        break;
      case "iniciar_separacao":
        result = await PedidoService.iniciarSeparacao(pedidoId, actor);
        break;
      case "finalizar_separacao":
        result = await PedidoService.finalizarSeparacao(pedidoId, actor);
        break;
      case "despachar":
        result = await PedidoService.despacharPedido(pedidoId, actor);
        break;
      case "finalizar":
        result = await PedidoService.finalizarPedido(pedidoId, actor);
        break;
      case "cancelar":
        result = await PedidoService.cancelarPedido(pedidoId, actor, dados?.observacao);
        break;
      default:
        return NextResponse.json({ error: "Acao invalida." }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("POST /api/vendas/[id]/transicao", error);
    const message = error.message || "Erro ao processar transicao.";
    const status = message.includes("permissao") || message.includes("Autenticacao") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
