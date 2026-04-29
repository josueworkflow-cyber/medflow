import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const tipo = req.nextUrl.searchParams.get("tipo");
    const status = req.nextUrl.searchParams.get("status");

    const where: Record<string, unknown> = {};
    if (tipo) where.tipo = tipo;
    if (status) where.status = status;

    const contas = await prisma.conta.findMany({
      where,
      include: {
        cliente: { select: { razaoSocial: true } },
        fornecedor: { select: { razaoSocial: true } },
      },
      orderBy: { dataVencimento: "asc" },
    });

    return NextResponse.json(contas);
  } catch (error) {
    console.error("GET /api/financeiro", error);
    return NextResponse.json({ error: "Erro ao buscar contas." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body.descricao?.trim() || !body.valor || !body.dataVencimento || !body.tipo) {
      return NextResponse.json(
        { error: "Descrição, valor, vencimento e tipo são obrigatórios." },
        { status: 400 }
      );
    }

    const conta = await prisma.conta.create({
      data: {
        tipo: body.tipo,
        descricao: body.descricao.trim(),
        valor: Number(body.valor),
        dataVencimento: new Date(body.dataVencimento),
        observacao: body.observacao || null,
        clienteId: body.clienteId ? Number(body.clienteId) : null,
        fornecedorId: body.fornecedorId ? Number(body.fornecedorId) : null,
        pedidoVendaId: body.pedidoVendaId ? Number(body.pedidoVendaId) : null,
      },
    });

    return NextResponse.json(conta, { status: 201 });
  } catch (error) {
    console.error("POST /api/financeiro", error);
    return NextResponse.json({ error: "Erro ao criar conta." }, { status: 500 });
  }
}
