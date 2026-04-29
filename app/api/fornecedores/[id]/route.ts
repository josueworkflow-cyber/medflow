import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const fornecedor = await prisma.fornecedor.findUnique({
      where: { id: Number(id) },
    });
    if (!fornecedor) {
      return NextResponse.json({ error: "Fornecedor não encontrado." }, { status: 404 });
    }
    return NextResponse.json(fornecedor);
  } catch (error) {
    console.error("GET /api/fornecedores/[id]", error);
    return NextResponse.json({ error: "Erro ao buscar fornecedor." }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const fornecedor = await prisma.fornecedor.update({
      where: { id: Number(id) },
      data: {
        razaoSocial: body.razaoSocial ?? undefined,
        nomeFantasia: body.nomeFantasia ?? undefined,
        cnpj: body.cnpj ?? undefined,
        email: body.email ?? undefined,
        telefone: body.telefone ?? undefined,
        endereco: body.endereco ?? undefined,
        cidade: body.cidade ?? undefined,
        estado: body.estado ?? undefined,
        cep: body.cep ?? undefined,
        ativo: body.ativo ?? undefined,
      },
    });
    return NextResponse.json(fornecedor);
  } catch (error) {
    console.error("PUT /api/fornecedores/[id]", error);
    return NextResponse.json({ error: "Erro ao atualizar fornecedor." }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.fornecedor.update({
      where: { id: Number(id) },
      data: { ativo: false },
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/fornecedores/[id]", error);
    return NextResponse.json({ error: "Erro ao desativar fornecedor." }, { status: 500 });
  }
}
