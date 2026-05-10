import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthActor, assertPerfil } from "@/lib/authz";

function gerarParcelas(
  valorTotal: number,
  quantidade: number,
  intervalo: number,
  dataBase: Date,
  baseData: Omit<Record<string, unknown>, "dataVencimento" | "valor" | "parcelaNumero" | "parcelaTotal">
) {
  const valorParcela = Math.round((valorTotal / quantidade) * 100) / 100;
  const valorUltima = Math.round((valorTotal - valorParcela * (quantidade - 1)) * 100) / 100;
  return Array.from({ length: quantidade }, (_, i) => {
    const vencimento = new Date(dataBase);
    vencimento.setDate(vencimento.getDate() + intervalo * i);
    return {
      ...baseData,
      valor: i === quantidade - 1 ? valorUltima : valorParcela,
      dataVencimento: vencimento,
      parcelaNumero: i + 1,
      parcelaTotal: quantidade,
    } as any;
  });
}

export async function GET(req: NextRequest) {
  const actor = await getAuthActor();
  if (!actor) return NextResponse.json({ error: "Nao autorizado." }, { status: 401 });
  try {
    assertPerfil(actor, ["FINANCEIRO"]);
    const tipo = req.nextUrl.searchParams.get("tipo");
    const status = req.nextUrl.searchParams.get("status");
    const clienteId = req.nextUrl.searchParams.get("clienteId");

    const where: Record<string, unknown> = {};
    if (tipo) where.tipo = tipo;
    if (status) {
      where.status = { in: (status as string).split(",") };
    }
    if (clienteId) where.clienteId = Number(clienteId);

    const contas = await prisma.conta.findMany({
      where,
      include: {
        cliente: { select: { razaoSocial: true } },
        fornecedor: { select: { razaoSocial: true } },
        pedidoVenda: { select: { numero: true } },
        historicoPagamentos: { orderBy: { data: "desc" } },
      },
      orderBy: { dataVencimento: "asc" },
    });

    return NextResponse.json(contas);
  } catch (e: any) {
    if (e.message?.includes("permissao")) return NextResponse.json({ error: e.message }, { status: 403 });
    console.error("GET /api/financeiro", e);
    return NextResponse.json({ error: "Erro ao buscar contas." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const actor = await getAuthActor();
  if (!actor) return NextResponse.json({ error: "Nao autorizado." }, { status: 401 });
  try {
    assertPerfil(actor, ["FINANCEIRO"]);
    const body = await req.json();

    if (!body.descricao?.trim() || !body.valor || !body.dataVencimento || !body.tipo) {
      return NextResponse.json(
        { error: "Descricao, valor, vencimento e tipo sao obrigatorios." },
        { status: 400 }
      );
    }

    const parcelas = Number(body.parcelas) || 1;
    const intervalo = Number(body.intervalo) || 30;
    const valorTotal = Number(body.valor);
    const baseVencimento = new Date(body.dataVencimento);

    const baseData = {
      tipo: body.tipo,
      descricao: body.descricao.trim(),
      observacao: body.observacao || null,
      clienteId: body.clienteId ? Number(body.clienteId) : null,
      fornecedorId: body.fornecedorId ? Number(body.fornecedorId) : null,
      pedidoVendaId: body.pedidoVendaId ? Number(body.pedidoVendaId) : null,
      formaPagamento: body.formaPagamento || null,
      categoria: body.categoria || null,
    };

    if (parcelas > 1) {
      const dadosParcelas = gerarParcelas(valorTotal, parcelas, intervalo, baseVencimento, baseData);
      await prisma.conta.createMany({ data: dadosParcelas });
      const contas = await prisma.conta.findMany({
        where: {
          descricao: body.descricao.trim(),
          tipo: body.tipo,
          parcelaTotal: parcelas,
        },
        orderBy: { parcelaNumero: "asc" },
        take: parcelas,
      });
      return NextResponse.json(contas, { status: 201 });
    }

    const conta = await prisma.conta.create({
      data: {
        ...baseData,
        valor: valorTotal,
        dataVencimento: baseVencimento,
      },
    });

    return NextResponse.json(conta, { status: 201 });
  } catch (e: any) {
    if (e.message?.includes("permissao")) return NextResponse.json({ error: e.message }, { status: 403 });
    console.error("POST /api/financeiro", e);
    return NextResponse.json({ error: "Erro ao criar conta." }, { status: 500 });
  }
}
