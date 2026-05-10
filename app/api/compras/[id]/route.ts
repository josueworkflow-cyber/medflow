import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthActor, assertPerfil } from "@/lib/authz";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const actor = await getAuthActor();
  if (!actor) return NextResponse.json({ error: "Nao autorizado." }, { status: 401 });
  try {
    assertPerfil(actor, ["ESTOQUE"]);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 403 });
  }
  try {
    const { id } = await params;
    const pedido = await prisma.pedidoCompra.findUnique({
      where: { id: Number(id) },
      include: {
        fornecedor: true,
        itens: { include: { produto: true } },
      },
    });
    if (!pedido) return NextResponse.json({ error: "Pedido não encontrado." }, { status: 404 });
    return NextResponse.json(pedido);
  } catch (error) {
    console.error("GET /api/compras/[id]", error);
    return NextResponse.json({ error: "Erro." }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const actor = await getAuthActor();
  if (!actor) return NextResponse.json({ error: "Nao autorizado." }, { status: 401 });
  try {
    assertPerfil(actor, ["ESTOQUE"]);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 403 });
  }
  try {
    const { id } = await params;
    const body = await req.json();

    const pedido = await prisma.pedidoCompra.update({
      where: { id: Number(id) },
      data: {
        status: body.status ?? undefined,
        observacao: body.observacao ?? undefined,
      },
    });

    return NextResponse.json(pedido);
  } catch (error) {
    console.error("PUT /api/compras/[id]", error);
    return NextResponse.json({ error: "Erro ao atualizar pedido." }, { status: 500 });
  }
}
