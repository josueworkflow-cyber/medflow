import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const vendedor = await prisma.vendedor.update({
      where: { id: Number(id) },
      data: {
        nome: body.nome ?? undefined,
        email: body.email ?? undefined,
        telefone: body.telefone ?? undefined,
        comissao: body.comissao != null ? Number(body.comissao) : undefined,
        metaMensal: body.metaMensal != null ? Number(body.metaMensal) : undefined,
        ativo: body.ativo ?? undefined,
      },
    });
    return NextResponse.json(vendedor);
  } catch (error) {
    console.error("PUT /api/vendedores/[id]", error);
    return NextResponse.json({ error: "Erro ao atualizar vendedor." }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.vendedor.update({ where: { id: Number(id) }, data: { ativo: false } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/vendedores/[id]", error);
    return NextResponse.json({ error: "Erro ao desativar vendedor." }, { status: 500 });
  }
}
