import { NextRequest, NextResponse } from "next/server";
import { atualizarCategoria, deletarCategoria } from "@/lib/services/categorias.service";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    const categoria = await atualizarCategoria(Number(id), {
      nome: body.nome ?? undefined,
      ativo: body.ativo ?? undefined,
    });

    return NextResponse.json(categoria);
  } catch (error) {
    console.error("PUT /api/produto/categoria/[id]", error);
    return NextResponse.json(
      { error: "Erro ao atualizar categoria." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await deletarCategoria(Number(id));

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/produto/categoria/[id]", error);
    return NextResponse.json(
      { error: "Erro ao desativar categoria." },
      { status: 500 }
    );
  }
}
