import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const cliente = await prisma.cliente.findUnique({ where: { id: Number(id) } });
    if (!cliente) return NextResponse.json({ error: "Cliente não encontrado." }, { status: 404 });
    return NextResponse.json(cliente);
  } catch (error) {
    console.error("GET /api/clientes/[id]", error);
    return NextResponse.json({ error: "Erro ao buscar cliente." }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const cliente = await prisma.cliente.update({
      where: { id: Number(id) },
      data: {
        razaoSocial: body.razaoSocial ?? undefined,
        nomeFantasia: body.nomeFantasia ?? undefined,
        cnpjCpf: body.cnpjCpf ?? undefined,
        email: body.email ?? undefined,
        telefone: body.telefone ?? undefined,
        endereco: body.endereco ?? undefined,
        cidade: body.cidade ?? undefined,
        estado: body.estado ?? undefined,
        cep: body.cep ?? undefined,
        limiteCredito: body.limiteCredito != null ? Number(body.limiteCredito) : undefined,
        ativo: body.ativo ?? undefined,
      },
    });
    return NextResponse.json(cliente);
  } catch (error) {
    console.error("PUT /api/clientes/[id]", error);
    return NextResponse.json({ error: "Erro ao atualizar cliente." }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.cliente.update({ where: { id: Number(id) }, data: { ativo: false } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/clientes/[id]", error);
    return NextResponse.json({ error: "Erro ao desativar cliente." }, { status: 500 });
  }
}
