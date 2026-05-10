import { NextRequest, NextResponse } from "next/server";
import { atualizarCategoria, deletarCategoria } from "@/lib/services/categorias.service";
import { getAuthActor, assertPerfil } from "@/lib/authz";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const actor = await getAuthActor();
  if (!actor) return NextResponse.json({ error: "Nao autorizado." }, { status: 401 });
  try {
    assertPerfil(actor, ["VENDAS", "ESTOQUE"]);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 403 });
  }
  try {
    const { id } = await params;
    const body = await req.json();

    const categoria = await atualizarCategoria(Number(id), {
      nome: body.nome ?? undefined,
      ativo: body.ativo ?? undefined,
      parentId: body.parentId !== undefined ? (body.parentId === null ? null : body.parentId) : undefined,
    });

    return NextResponse.json(categoria);
  } catch (error) {
    console.error("PUT /api/produto/categoria/[id]", error);
    const message = error instanceof Error ? error.message : "Erro ao atualizar categoria.";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const actor = await getAuthActor();
  if (!actor) return NextResponse.json({ error: "Nao autorizado." }, { status: 401 });
  try {
    assertPerfil(actor, ["VENDAS", "ESTOQUE"]);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 403 });
  }
  try {
    const { searchParams } = new URL(req.url);
    const idParam = searchParams.get("id");
    const { id } = await params;
    const categoryId = idParam || id;

    if (!categoryId) {
      return NextResponse.json(
        { error: "ID da categoria e obrigatorio." },
        { status: 400 }
      );
    }

    await deletarCategoria(Number(categoryId));

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/produto/categoria/[id]", error);
    const message = error instanceof Error ? error.message : "Erro ao desativar categoria.";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
