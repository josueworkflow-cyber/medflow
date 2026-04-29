import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const clientes = await prisma.cliente.findMany({
      where: { ativo: true },
      orderBy: { razaoSocial: "asc" },
    });
    return NextResponse.json(clientes);
  } catch (error) {
    console.error("GET /api/clientes", error);
    return NextResponse.json({ error: "Erro ao buscar clientes." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body.razaoSocial?.trim()) {
      return NextResponse.json({ error: "Razão social é obrigatória." }, { status: 400 });
    }

    const cliente = await prisma.cliente.create({
      data: {
        razaoSocial: body.razaoSocial.trim(),
        nomeFantasia: body.nomeFantasia || null,
        cnpjCpf: body.cnpjCpf || null,
        email: body.email || null,
        telefone: body.telefone || null,
        endereco: body.endereco || null,
        cidade: body.cidade || null,
        estado: body.estado || null,
        cep: body.cep || null,
        limiteCredito: Number(body.limiteCredito || 0),
      },
    });

    return NextResponse.json(cliente, { status: 201 });
  } catch (error) {
    console.error("POST /api/clientes", error);
    return NextResponse.json({ error: "Erro ao cadastrar cliente." }, { status: 500 });
  }
}
