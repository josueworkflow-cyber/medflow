import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PedidoService } from "@/lib/services/pedido.service";
import { requireAuthActor } from "@/lib/authz";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const pedido = await prisma.pedidoVenda.findUnique({
      where: { id: Number(id) },
      include: {
        cliente: true,
        vendedor: true,
        empresaFiscal: { select: { razaoSocial: true, cnpj: true, nomeFantasia: true, inscricaoEstadual: true, regimeTributario: true } },
        documentosFiscais: true,
        itens: { include: { produto: true } },
        separacao: { include: { itens: true } },
        historico: {
          include: { usuario: { select: { nome: true } } },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!pedido) {
      return NextResponse.json({ error: "Pedido nao encontrado." }, { status: 404 });
    }

    return NextResponse.json(pedido);
  } catch (error) {
    console.error("GET /api/vendas/[id]", error);
    return NextResponse.json({ error: "Erro." }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const actor = await requireAuthActor();
    const body = await req.json();

    const pedido = await PedidoService.atualizarDadosPedido(Number(id), {
      observacao: body.observacao,
      formaPagamento: body.formaPagamento,
      prazoPagamento: body.prazoPagamento,
      desconto: body.desconto !== undefined ? Number(body.desconto) : undefined,
    }, actor);

    return NextResponse.json(pedido);
  } catch (error: any) {
    console.error("PUT /api/vendas/[id]", error);
    const message = error.message || "Erro ao atualizar pedido.";
    const status = message.includes("permissao") || message.includes("Autenticacao") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
