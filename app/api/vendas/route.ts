import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PedidoService } from "@/lib/services/pedido.service";
import { requireAuthActor } from "@/lib/authz";

export async function GET() {
  try {
    const pedidos = await prisma.pedidoVenda.findMany({
      include: {
        cliente: { select: { razaoSocial: true } },
        vendedor: { select: { nome: true } },
        empresaFiscal: { select: { nomeFantasia: true } },
        itens: { include: { produto: { select: { descricao: true } } } },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(pedidos);
  } catch (error) {
    console.error("GET /api/vendas", error);
    return NextResponse.json({ error: "Erro ao buscar pedidos de venda." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const actor = await requireAuthActor();
    const body = await req.json();

    const pedido = await PedidoService.criarPedido({
      clienteId: Number(body.clienteId),
      vendedorId: body.vendedorId ? Number(body.vendedorId) : undefined,
      tipoPedido: body.tipoPedido || 'PEDIDO_NORMAL',
      empresaFiscalId: body.empresaFiscalId ? Number(body.empresaFiscalId) : undefined,
      desconto: Number(body.desconto || 0),
      observacao: body.observacao || undefined,
      formaPagamento: body.formaPagamento || undefined,
      prazoPagamento: body.prazoPagamento || undefined,
      itens: body.itens.map((i: any) => ({
        produtoId: Number(i.produtoId),
        quantidade: Number(i.quantidade),
        precoUnitario: Number(i.precoUnitario),
        desconto: Number(i.desconto || 0),
      })),
    }, actor);

    return NextResponse.json(pedido, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/vendas", error);
    return NextResponse.json({ error: error.message || "Erro ao criar pedido de venda." }, { status: 500 });
  }
}
