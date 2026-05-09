import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const filtro = req.nextUrl.searchParams.get("filtro") || "todos";

    const statusPorFiltro: Record<string, string[]> = {
      pre_aprovacao: ["AGUARDANDO_APROVACAO_FINANCEIRA", "PAGAMENTO_PENDENTE", "CONDICAO_COMERCIAL_PENDENTE"],
      pre_aprovados: ["APROVADO_FINANCEIRO", "AGUARDANDO_CONFIRMACAO_CLIENTE"],
      cliente_confirmou: ["CLIENTE_CONFIRMOU", "AGUARDANDO_FATURAMENTO"],
      faturamento: ["AGUARDANDO_FATURAMENTO"],
      pendente_interno: ["AGUARDANDO_FATURAMENTO"],
      faturados: ["FATURADO", "AUTORIZADO_PARA_SEPARACAO", "EM_SEPARACAO", "SEPARADO", "DESPACHADO", "FINALIZADO"],
      liberados: ["AUTORIZADO_PARA_SEPARACAO", "EM_SEPARACAO", "SEPARADO"],
      revisao: ["REPROVADO_FINANCEIRO", "PEDIDO_EM_REVISAO"],
      todos: [
        "AGUARDANDO_APROVACAO_FINANCEIRA", "PAGAMENTO_PENDENTE", "CONDICAO_COMERCIAL_PENDENTE",
        "APROVADO_FINANCEIRO", "AGUARDANDO_CONFIRMACAO_CLIENTE", "CLIENTE_CONFIRMOU",
        "AGUARDANDO_FATURAMENTO", "FATURADO", "PEDIDO_INTERNO_AUTORIZADO",
        "AUTORIZADO_PARA_SEPARACAO", "EM_SEPARACAO", "SEPARADO", "DESPACHADO", "FINALIZADO",
        "REPROVADO_FINANCEIRO", "PEDIDO_EM_REVISAO",
      ],
    };

    const statuses = statusPorFiltro[filtro] || statusPorFiltro.todos;

    const where: any = { status: { in: statuses } };
    if (filtro === "pendente_interno") {
      where.tipoPedido = "PEDIDO_INTERNO";
    }

    const pedidos = await prisma.pedidoVenda.findMany({
      where,
      include: {
        cliente: true,
        vendedor: { select: { nome: true } },
        empresaFiscal: true,
        itens: { include: { produto: { select: { descricao: true } } } },
        historico: { orderBy: { createdAt: "desc" }, take: 10, include: { usuario: { select: { nome: true } } } },
      },
      orderBy: { createdAt: "asc" },
    });

    const clienteIds = [...new Set(pedidos.map((p) => p.clienteId))];
    const historicoClientes: Record<number, any> = {};
    for (const cid of clienteIds) {
      const contas = await prisma.conta.findMany({
        where: { clienteId: cid },
        select: { tipo: true, valor: true, valorPago: true, status: true },
      });
      const totalCompras = await prisma.pedidoVenda.count({ where: { clienteId: cid, status: { not: "CANCELADO" } } });
      const contasAbertas = contas.filter((c) => c.tipo === "RECEBER" && c.status === "ABERTA");
      const contasVencidas = contas.filter((c) => c.tipo === "RECEBER" && c.status === "VENCIDA");

      historicoClientes[cid] = {
        totalCompras,
        contasAbertas: contasAbertas.length,
        valorAberto: contasAbertas.reduce((s, c) => s + c.valor - c.valorPago, 0),
        inadimplencias: contasVencidas.length,
        valorInadimplente: contasVencidas.reduce((s, c) => s + c.valor - c.valorPago, 0),
      };
    }

    const empresas = await prisma.empresaFiscal.findMany({ where: { ativo: true } });

    return NextResponse.json({ pedidos, historicoClientes, empresas, filtro });
  } catch (error) {
    console.error("GET /api/financeiro/pedidos", error);
    return NextResponse.json({ error: "Erro." }, { status: 500 });
  }
}
