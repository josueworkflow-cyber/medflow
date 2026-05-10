import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthActor, assertPerfil } from "@/lib/authz";

export async function GET() {
  const actor = await getAuthActor();
  if (!actor) return NextResponse.json({ error: "Nao autorizado." }, { status: 401 });
  try {
    assertPerfil(actor, ["ESTOQUE", "FINANCEIRO"]);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 403 });
  }
  try {
    const fornecedores = await prisma.fornecedor.findMany({
      where: { ativo: true },
      orderBy: { razaoSocial: "asc" },
    });
    return NextResponse.json(fornecedores);
  } catch (error) {
    console.error("GET /api/fornecedores", error);
    return NextResponse.json({ error: "Erro ao buscar fornecedores." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const actor = await getAuthActor();
  if (!actor) return NextResponse.json({ error: "Nao autorizado." }, { status: 401 });
  try {
    assertPerfil(actor, ["ESTOQUE", "FINANCEIRO"]);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 403 });
  }
  try {
    const body = await req.json();

    if (!body.razaoSocial?.trim()) {
      return NextResponse.json({ error: "Razão social é obrigatória." }, { status: 400 });
    }

    const fornecedor = await prisma.fornecedor.create({
      data: {
        razaoSocial: body.razaoSocial.trim(),
        nomeFantasia: body.nomeFantasia || null,
        cnpj: body.cnpj || null,
        email: body.email || null,
        telefone: body.telefone || null,
        endereco: body.endereco || null,
        cidade: body.cidade || null,
        estado: body.estado || null,
        cep: body.cep || null,
      },
    });

    return NextResponse.json(fornecedor, { status: 201 });
  } catch (error) {
    console.error("POST /api/fornecedores", error);
    return NextResponse.json({ error: "Erro ao cadastrar fornecedor." }, { status: 500 });
  }
}
