import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function GET() {
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
    return NextResponse.json({ error: "Erro ao buscar usuários." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body.nome?.trim() || !body.email?.trim() || !body.senha?.trim()) {
      return NextResponse.json(
        { error: "Nome, email e senha são obrigatórios." },
        { status: 400 }
      );
    }

    const existente = await prisma.usuario.findUnique({
      where: { email: body.email.trim() },
    });

    if (existente) {
      return NextResponse.json({ error: "Email já cadastrado." }, { status: 400 });
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
    return NextResponse.json({ error: "Erro ao criar usuário." }, { status: 500 });
  }
}
