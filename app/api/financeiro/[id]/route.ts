import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    const data: Record<string, unknown> = {};
    if (body.status) data.status = body.status;
    if (body.dataPagamento) data.dataPagamento = new Date(body.dataPagamento);
    if (body.observacao !== undefined) data.observacao = body.observacao;

    // Se marcar como PAGA e não informar data, usar hoje
    if (body.status === "PAGA" && !body.dataPagamento) {
      data.dataPagamento = new Date();
    }

    const conta = await prisma.conta.update({
      where: { id: Number(id) },
      data,
    });

    return NextResponse.json(conta);
  } catch (error) {
    console.error("PUT /api/financeiro/[id]", error);
    return NextResponse.json({ error: "Erro ao atualizar conta." }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.conta.update({
      where: { id: Number(id) },
      data: { status: "CANCELADA" },
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/financeiro/[id]", error);
    return NextResponse.json({ error: "Erro ao cancelar conta." }, { status: 500 });
  }
}
