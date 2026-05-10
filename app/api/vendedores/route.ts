import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthActor, assertPerfil } from "@/lib/authz";

export async function GET() {
  const actor = await getAuthActor();
  if (!actor) return NextResponse.json({ error: "Nao autorizado." }, { status: 401 });
  try {
    assertPerfil(actor, ["VENDAS"]);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 403 });
  }
  try {
    const vendedores = await prisma.vendedor.findMany({
      where: { ativo: true },
      orderBy: { nome: "asc" },
    });
    return NextResponse.json(vendedores);
  } catch (error) {
    console.error("GET /api/vendedores", error);
    return NextResponse.json({ error: "Erro ao buscar vendedores." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const actor = await getAuthActor();
  if (!actor) return NextResponse.json({ error: "Nao autorizado." }, { status: 401 });
  try {
    assertPerfil(actor, ["VENDAS"]);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 403 });
  }
  try {
    const body = await req.json();
    if (!body.nome?.trim()) {
      return NextResponse.json({ error: "Nome é obrigatório." }, { status: 400 });
    }
    const vendedor = await prisma.vendedor.create({
      data: {
        nome: body.nome.trim(),
        email: body.email || null,
        telefone: body.telefone || null,
        comissao: Number(body.comissao || 0),
        metaMensal: Number(body.metaMensal || 0),
      },
    });
    return NextResponse.json(vendedor, { status: 201 });
  } catch (error) {
    console.error("POST /api/vendedores", error);
    return NextResponse.json({ error: "Erro ao cadastrar vendedor." }, { status: 500 });
  }
}
