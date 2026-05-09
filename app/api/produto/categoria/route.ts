import { NextResponse } from "next/server";
import { getCategorias, criarCategoria, getAllCategoriasFlat } from "@/lib/services/categorias.service";

export async function GET() {
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
  try {
    const body = await req.json();

    if (!body.nome || !String(body.nome).trim()) {
      return NextResponse.json(
        { error: "Nome da categoria é obrigatório." },
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