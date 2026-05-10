import { NextResponse } from "next/server";
import { getCategorias, criarCategoria, getAllCategoriasFlat } from "@/lib/services/categorias.service";
import { getAuthActor, assertPerfil } from "@/lib/authz";

export async function GET() {
  const actor = await getAuthActor();
  if (!actor) return NextResponse.json({ error: "Nao autorizado." }, { status: 401 });
  try {
    assertPerfil(actor, ["VENDAS", "ESTOQUE"]);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 403 });
  }
  try {
    const hierarchical = await getCategorias();
    const flat = await getAllCategoriasFlat();
    return NextResponse.json({ hierarchical, flat });
  } catch (error) {
    console.error("GET /api/produto/categoria", error);
    return NextResponse.json(
      { error: "Erro ao buscar categorias." },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const actor = await getAuthActor();
  if (!actor) return NextResponse.json({ error: "Nao autorizado." }, { status: 401 });
  try {
    assertPerfil(actor, ["VENDAS", "ESTOQUE"]);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 403 });
  }
  try {
    const body = await req.json();

    if (!body.nome || !String(body.nome).trim()) {
      return NextResponse.json(
        { error: "Nome da categoria e obrigatorio." },
        { status: 400 }
      );
    }

    const categoria = await criarCategoria(body.nome, body.parentId);
    return NextResponse.json(categoria, { status: 201 });
  } catch (error) {
    console.error("POST /api/produto/categoria", error);
    const message = error instanceof Error ? error.message : "Erro ao criar categoria.";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
