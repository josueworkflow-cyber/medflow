import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PedidoService } from "@/lib/services/pedido.service";


export async function GET() {
  try {
    const separacoes = await prisma.separacao.findMany({
      include: {
        pedidoVenda: {
          include: {
            cliente: { select: { razaoSocial: true } },
          },
        },
        itens: {
          include: {
            produto: { select: { descricao: true } },
            lote: { select: { numeroLote: true } },
          },
        },
        romaneio: true,
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(separacoes);
  } catch (error) {
    console.error("GET /api/logistica", error);
    return NextResponse.json({ error: "Erro ao buscar separações." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body.pedidoVendaId) {
      return NextResponse.json({ error: "Pedido de venda é obrigatório." }, { status: 400 });
    }

    // Buscar itens do pedido de venda automaticamente
    const pedido = await prisma.pedidoVenda.findUnique({
      where: { id: Number(body.pedidoVendaId) },
      include: { itens: true },
    });

    if (!pedido) {
      return NextResponse.json({ error: "Pedido não encontrado." }, { status: 404 });
    }

    const separacao = await PedidoService.iniciarSeparacao(Number(body.pedidoVendaId), body.usuarioId);


    return NextResponse.json(separacao, { status: 201 });
  } catch (error) {
    console.error("POST /api/logistica", error);
    return NextResponse.json({ error: "Erro ao criar separação." }, { status: 500 });
  }
}
