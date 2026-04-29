import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const pedidos = await prisma.pedidoCompra.findMany({
      include: {
        fornecedor: { select: { razaoSocial: true } },
        itens: { include: { produto: { select: { descricao: true } } } },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(pedidos);
  } catch (error) {
    console.error("GET /api/compras", error);
    return NextResponse.json({ error: "Erro ao buscar pedidos de compra." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body.fornecedorId) {
      return NextResponse.json({ error: "Fornecedor é obrigatório." }, { status: 400 });
    }

    if (!body.itens || body.itens.length === 0) {
      return NextResponse.json({ error: "Adicione pelo menos um item." }, { status: 400 });
    }

    const valorTotal = body.itens.reduce(
      (sum: number, item: { quantidade: number; precoUnitario: number }) =>
        sum + item.quantidade * item.precoUnitario,
      0
    );

    const pedido = await prisma.pedidoCompra.create({
      data: {
        fornecedorId: Number(body.fornecedorId),
        observacao: body.observacao || null,
        valorTotal,
        itens: {
          create: body.itens.map(
            (item: { produtoId: number; quantidade: number; precoUnitario: number }) => ({
              produtoId: Number(item.produtoId),
              quantidade: Number(item.quantidade),
              precoUnitario: Number(item.precoUnitario),
              subtotal: Number(item.quantidade) * Number(item.precoUnitario),
            })
          ),
        },
      },
      include: { itens: true },
    });

    return NextResponse.json(pedido, { status: 201 });
  } catch (error) {
    console.error("POST /api/compras", error);
    return NextResponse.json({ error: "Erro ao criar pedido de compra." }, { status: 500 });
  }
}
