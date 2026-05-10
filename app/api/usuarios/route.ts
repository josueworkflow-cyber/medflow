import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { getAuthActor, assertPerfil } from "@/lib/authz";

export async function GET() {
  const actor = await getAuthActor();
  if (!actor) return NextResponse.json({ error: "Nao autorizado." }, { status: 401 });
  try {
    assertPerfil(actor, ["ADMINISTRADOR"]);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 403 });
  }
  try {
    const usuarios = await prisma.usuario.findMany({
      where: { ativo: true },
      select: {
        id: true,
        nome: true,
        email: true,
        perfil: true,
        ativo: true,
        createdAt: true,
      },
      orderBy: { nome: "asc" },
    });
    return NextResponse.json(usuarios);
  } catch (error) {
    console.error("GET /api/usuarios", error);
    return NextResponse.json({ error: "Erro ao buscar usuarios." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const actor = await getAuthActor();
  if (!actor) return NextResponse.json({ error: "Nao autorizado." }, { status: 401 });
  try {
    assertPerfil(actor, ["ADMINISTRADOR"]);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 403 });
  }
  try {
    const body = await req.json();

    if (!body.nome?.trim() || !body.email?.trim() || !body.senha?.trim()) {
      return NextResponse.json(
        { error: "Nome, email e senha sao obrigatorios." },
        { status: 400 }
      );
    }

    const existente = await prisma.usuario.findUnique({
      where: { email: body.email.trim() },
    });

    if (existente) {
      return NextResponse.json({ error: "Email ja cadastrado." }, { status: 400 });
    }

    const hashedSenha = await bcrypt.hash(body.senha, 12);

    const usuario = await prisma.usuario.create({
      data: {
        nome: body.nome.trim(),
        email: body.email.trim(),
        senha: hashedSenha,
        perfil: body.perfil || "VENDAS",
      },
      select: {
        id: true,
        nome: true,
        email: true,
        perfil: true,
        createdAt: true,
      },
    });

    return NextResponse.json(usuario, { status: 201 });
  } catch (error) {
    console.error("POST /api/usuarios", error);
    return NextResponse.json({ error: "Erro ao criar usuario." }, { status: 500 });
  }
}
