import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PedidoService } from "@/lib/services/pedido.service";
import { getAuthActor, assertPerfil } from "@/lib/authz";
import { z } from "zod";
import { TipoPedido, FormaPagamento } from "@prisma/client";

const itemPedidoSchema = z.object({
  produtoId: z.coerce.number().int().positive("ID do produto inválido"),
  quantidade: z.coerce.number().positive("Quantidade deve ser maior que zero"),
  precoUnitario: z.coerce.number().nonnegative("Preço unitário não pode ser negativo"),
  desconto: z.coerce.number().nonnegative("Desconto não pode ser negativo").optional().default(0),
});

const pedidoVendaSchema = z.object({
  clienteId: z.coerce.number().int().positive("ID do cliente inválido"),
  vendedorId: z.coerce.number().int().positive().optional().nullable(),
  tipoPedido: z.nativeEnum(TipoPedido).optional().default(TipoPedido.PEDIDO_NORMAL),
  empresaFiscalId: z.coerce.number().int().positive().optional().nullable(),
  desconto: z.coerce.number().nonnegative("Desconto não pode ser negativo").optional().default(0),
  observacao: z.string().optional().nullable(),
  formaPagamento: z.nativeEnum(FormaPagamento).optional().nullable(),
  prazoPagamento: z.string().optional().nullable(),
  itens: z.array(itemPedidoSchema).nonempty("O pedido deve ter pelo menos um item"),
});

export async function GET(req: NextRequest) {
  const actor = await getAuthActor();
  if (!actor) return NextResponse.json({ error: "Nao autorizado." }, { status: 401 });
  try {
    assertPerfil(actor, ["VENDAS"]);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 403 });
  }
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "0", 10);
    const pageSize = 50;

    const [pedidos, total] = await Promise.all([
      prisma.pedidoVenda.findMany({
        include: {
          cliente: { select: { razaoSocial: true } },
          vendedor: { select: { nome: true } },
          empresaFiscal: { select: { nomeFantasia: true } },
          itens: { include: { produto: { select: { descricao: true } } } },
        },
        orderBy: { createdAt: "desc" },
        take: pageSize,
        skip: page * pageSize,
      }),
      prisma.pedidoVenda.count(),
    ]);

    return NextResponse.json({ items: pedidos, total, page, pageSize });
  } catch (error) {
    console.error("GET /api/vendas", error);
    return NextResponse.json({ error: "Erro ao buscar pedidos de venda." }, { status: 500 });
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
    const parsed = pedidoVendaSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados inválidos.", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;

    const pedido = await PedidoService.criarPedido({
      clienteId: data.clienteId,
      vendedorId: data.vendedorId || undefined,
      tipoPedido: data.tipoPedido,
      empresaFiscalId: data.empresaFiscalId || undefined,
      desconto: data.desconto,
      observacao: data.observacao || undefined,
      formaPagamento: data.formaPagamento || undefined,
      prazoPagamento: data.prazoPagamento || undefined,
      itens: data.itens,
    }, actor);

    return NextResponse.json(pedido, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/vendas", error);
    return NextResponse.json({ error: error.message || "Erro ao criar pedido de venda." }, { status: 500 });
  }
}
