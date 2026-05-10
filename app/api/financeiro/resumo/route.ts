import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthActor, assertPerfil } from "@/lib/authz";

export async function GET() {
  try {
    const actor = await getAuthActor();
    if (!actor) return NextResponse.json({ error: "Nao autorizado." }, { status: 401 });
    try { assertPerfil(actor, ["FINANCEIRO"]); } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }

    const hoje = new Date();
    const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
    const hojeDate = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
    const amanha = new Date(hojeDate); amanha.setDate(amanha.getDate() + 1);

    const [
      contasReceber, contasPagar,
      recebidoMes, pagoMes,
      contasVencidas, contasVencendoHoje,
      preAprovacao, faturamento, internosAutorizar,
      clientesPendencia,
    ] = await Promise.all([
      prisma.conta.aggregate({
        where: { tipo: "RECEBER", status: { in: ["ABERTA", "VENCIDA"] } },
        _sum: { valor: true }, _count: true,
      }),
      prisma.conta.aggregate({
        where: { tipo: "PAGAR", status: { in: ["ABERTA", "VENCIDA"] } },
        _sum: { valor: true }, _count: true,
      }),
      prisma.conta.aggregate({
        where: { tipo: "RECEBER", status: "PAGA", dataPagamento: { gte: inicioMes, lte: fimMes } },
        _sum: { valor: true },
      }),
      prisma.conta.aggregate({
        where: { tipo: "PAGAR", status: "PAGA", dataPagamento: { gte: inicioMes, lte: fimMes } },
        _sum: { valor: true },
      }),
      prisma.conta.count({
        where: { status: "ABERTA", dataVencimento: { lt: hojeDate } },
      }),
      prisma.conta.count({
        where: {
          status: "ABERTA",
          dataVencimento: { gte: hojeDate, lt: amanha },
        },
      }),
      prisma.pedidoVenda.count({
        where: { status: { in: ["AGUARDANDO_APROVACAO_FINANCEIRA", "PAGAMENTO_PENDENTE", "CONDICAO_COMERCIAL_PENDENTE"] } },
      }),
      prisma.pedidoVenda.count({
        where: { status: { in: ["AGUARDANDO_FATURAMENTO", "CLIENTE_CONFIRMOU"] } },
      }),
      prisma.pedidoVenda.count({
        where: { tipoPedido: "PEDIDO_INTERNO", status: "AGUARDANDO_FATURAMENTO" },
      }),
      prisma.cliente.count({
        where: {
          contasReceber: {
            some: { status: { in: ["ABERTA", "VENCIDA"] } },
          },
        },
      }),
    ]);

    const recebido = recebidoMes._sum.valor || 0;
    const pago = pagoMes._sum.valor || 0;
    const saldoRealizado = recebido - pago;
    const aReceber = contasReceber._sum.valor || 0;
    const aPagar = contasPagar._sum.valor || 0;
    const saldoPrevisto = aReceber - aPagar;

    return NextResponse.json({
      aReceber,
      qtdReceber: contasReceber._count,
      aPagar,
      qtdPagar: contasPagar._count,
      recebidoMes: recebido,
      pagoMes: pago,
      saldoRealizado,
      saldoPrevisto,
      contasVencidas,
      vencendoHoje: contasVencendoHoje,
      preAprovacao,
      faturamento,
      internosAutorizar,
      clientesPendencia,
    });
  } catch (error) {
    console.error("GET /api/financeiro/resumo", error);
    return NextResponse.json({ error: "Erro ao gerar resumo financeiro." }, { status: 500 });
  }
}
