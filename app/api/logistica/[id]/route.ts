import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PedidoService } from "@/lib/services/pedido.service";


export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    const separacao = await prisma.separacao.update({
      where: { id: Number(id) },
      data: {
        status: body.status ?? undefined,
        responsavel: body.responsavel ?? undefined,
        observacao: body.observacao ?? undefined,
      },
      include: { pedidoVenda: true },
    });

    // Se conferido, atualizar status do pedido
    if (body.status === "CONFERIDO") {
      await PedidoService.finalizarSeparacao(separacao.pedidoVendaId, body.usuarioId);
    }

    // Se criou romaneio e está enviado
    if (body.status === "ENVIADO" && body.romaneio) {
      await PedidoService.despacharPedido(separacao.pedidoVendaId, body.usuarioId, {
        motorista: body.romaneio.motorista,
        veiculo: body.romaneio.veiculo
      });
    }


    return NextResponse.json(separacao);
  } catch (error) {
    console.error("PUT /api/logistica/[id]", error);
    return NextResponse.json({ error: "Erro ao atualizar separação." }, { status: 500 });
  }
}
