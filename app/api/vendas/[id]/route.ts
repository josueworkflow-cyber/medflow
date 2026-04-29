import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const pedido = await prisma.pedidoVenda.findUnique({
      where: { id: Number(id) },
      include: {
        cliente: true,
        vendedor: true,
        empresaFiscal: { select: { razaoSocial: true, cnpj: true } },
        itens: { include: { produto: true } },
        separacao: { include: { itens: true, romaneio: true } },
        historico: {
          include: { usuario: { select: { nome: true } } },
          orderBy: { createdAt: "desc" }
        }
      },
    });
    if (!pedido) return NextResponse.json({ error: "Pedido não encontrado." }, { status: 404 });
    return NextResponse.json(pedido);
  } catch (error) {
    console.error("GET /api/vendas/[id]", error);
    return NextResponse.json({ error: "Erro." }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    
    // Status não pode ser alterado diretamente aqui, apenas via rota de transição
    const pedido = await prisma.pedidoVenda.update({
      where: { id: Number(id) },
      data: {
        observacao: body.observacao ?? undefined,
        desconto: body.desconto != null ? Number(body.desconto) : undefined,
      },
    });
    return NextResponse.json(pedido);
  } catch (error) {
    console.error("PUT /api/vendas/[id]", error);
    return NextResponse.json({ error: "Erro ao atualizar pedido." }, { status: 500 });
  }
}

