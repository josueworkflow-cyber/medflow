import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const hoje = new Date();
    const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);

    // Resumo de contas
    const contasReceber = await prisma.conta.aggregate({
      where: { tipo: "RECEBER", status: { in: ["ABERTA", "VENCIDA"] } },
      _sum: { valor: true },
      _count: true,
    });

    const contasPagar = await prisma.conta.aggregate({
      where: { tipo: "PAGAR", status: { in: ["ABERTA", "VENCIDA"] } },
      _sum: { valor: true },
      _count: true,
    });

    const recebidoMes = await prisma.conta.aggregate({
      where: {
        tipo: "RECEBER",
        status: "PAGA",
        dataPagamento: { gte: inicioMes, lte: fimMes },
      },
      _sum: { valor: true },
    });

    const pagoMes = await prisma.conta.aggregate({
      where: {
        tipo: "PAGAR",
        status: "PAGA",
        dataPagamento: { gte: inicioMes, lte: fimMes },
      },
      _sum: { valor: true },
    });

    const vencidas = await prisma.conta.count({
      where: {
        status: "ABERTA",
        dataVencimento: { lt: hoje },
      },
    });

    return NextResponse.json({
      aReceber: contasReceber._sum.valor || 0,
      qtdReceber: contasReceber._count,
      aPagar: contasPagar._sum.valor || 0,
      qtdPagar: contasPagar._count,
      recebidoMes: recebidoMes._sum.valor || 0,
      pagoMes: pagoMes._sum.valor || 0,
      saldoMes: (recebidoMes._sum.valor || 0) - (pagoMes._sum.valor || 0),
      vencidas,
    });
  } catch (error) {
    console.error("GET /api/financeiro/resumo", error);
    return NextResponse.json({ error: "Erro ao gerar resumo financeiro." }, { status: 500 });
  }
}
