import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const filtro = req.nextUrl.searchParams.get("filtro") || "todos";

    const statusPorFiltro: Record<string, string[]> = {
      verificacao: ["PEDIDO_CRIADO", "AGUARDANDO_ESTOQUE", "ESTOQUE_PARCIAL", "ESTOQUE_INDISPONIVEL", "AGUARDANDO_FORNECEDOR"],
      separacao: ["AUTORIZADO_PARA_SEPARACAO", "FATURADO", "PEDIDO_INTERNO_AUTORIZADO", "EM_SEPARACAO"],
      despacho: ["SEPARADO"],
      finalizados: ["DESPACHADO", "FINALIZADO"],
      todos: [
        "PEDIDO_CRIADO", "AGUARDANDO_ESTOQUE", "ESTOQUE_PARCIAL", "ESTOQUE_INDISPONIVEL", "AGUARDANDO_FORNECEDOR",
        "AUTORIZADO_PARA_SEPARACAO", "EM_SEPARACAO", "SEPARADO", "DESPACHADO", "FINALIZADO",
        "FATURADO", "PEDIDO_INTERNO_AUTORIZADO",
      ],
    };

    const statuses = (statusPorFiltro[filtro] || statusPorFiltro.todos) as any;

    const pedidos = await prisma.pedidoVenda.findMany({
      where: { status: { in: statuses } },
      include: {
        cliente: { select: { razaoSocial: true } },
        vendedor: { select: { nome: true } },
        empresaFiscal: { select: { nomeFantasia: true, razaoSocial: true } },
        itens: { include: { produto: { select: { descricao: true, codigoInterno: true } } } },
        separacao: { select: { status: true } },
        historico: { orderBy: { createdAt: "desc" }, take: 5, include: { usuario: { select: { nome: true } } } },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ pedidos, filtro });
  } catch (error) {
    console.error("GET /api/estoque/pedidos", error);
    return NextResponse.json({ error: "Erro ao buscar pedidos." }, { status: 500 });
  }
}
