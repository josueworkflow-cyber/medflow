import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const periodo = req.nextUrl.searchParams.get("periodo") || "30";
    const dataInicioParam = req.nextUrl.searchParams.get("dataInicio");
    const dataFimParam = req.nextUrl.searchParams.get("dataFim");

    const hoje = new Date();
    const hojeDate = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());

    let dataInicio: Date;
    let dataFim: Date;

    if (dataInicioParam && dataFimParam) {
      dataInicio = new Date(dataInicioParam);
      dataFim = new Date(dataFimParam);
      dataFim.setHours(23, 59, 59, 999);
    } else if (periodo === "hoje") {
      dataInicio = hojeDate;
      dataFim = new Date(hojeDate); dataFim.setHours(23, 59, 59, 999);
    } else if (periodo === "mes") {
      dataInicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      dataFim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
      dataFim.setHours(23, 59, 59, 999);
    } else {
      const dias = parseInt(periodo, 10) || 30;
      dataFim = new Date(hojeDate);
      dataFim.setDate(dataFim.getDate() + dias);
      dataFim.setHours(23, 59, 59, 999);
      dataInicio = hojeDate;
    }

    // Realizado: entradas e saidas ja pagas no periodo
    const [entradasRealizadas, saidasRealizadas] = await Promise.all([
      prisma.conta.aggregate({
        where: {
          tipo: "RECEBER",
          status: "PAGA",
          dataPagamento: { gte: dataInicio, lte: dataFim },
        },
        _sum: { valor: true },
      }),
      prisma.conta.aggregate({
        where: {
          tipo: "PAGAR",
          status: "PAGA",
          dataPagamento: { gte: dataInicio, lte: dataFim },
        },
        _sum: { valor: true },
      }),
    ]);

    // Previsto: contas em aberto ou vencidas que vencem ate o fim do periodo
    const [aReceberPrevisto, aPagarPrevisto] = await Promise.all([
      prisma.conta.aggregate({
        where: {
          tipo: "RECEBER",
          status: { in: ["ABERTA", "VENCIDA"] },
          dataVencimento: { lte: dataFim },
        },
        _sum: { valor: true },
      }),
      prisma.conta.aggregate({
        where: {
          tipo: "PAGAR",
          status: { in: ["ABERTA", "VENCIDA"] },
          dataVencimento: { lte: dataFim },
        },
        _sum: { valor: true },
      }),
    ]);

    // Visao por vencimento
    const agora = hoje.getTime();
    const em7 = new Date(hojeDate); em7.setDate(em7.getDate() + 7);
    const em15 = new Date(hojeDate); em15.setDate(em15.getDate() + 15);
    const em30 = new Date(hojeDate); em30.setDate(em30.getDate() + 30);

    const faixas = [
      { label: "Vencido", min: null, max: hojeDate },
      { label: "Vence hoje", min: hojeDate, max: new Date(hojeDate.getTime() + 86400000 - 1) },
      { label: "Proximos 7 dias", min: new Date(hojeDate.getTime() + 86400000), max: em7 },
      { label: "Proximos 15 dias", min: new Date(em7.getTime() + 86400000), max: em15 },
      { label: "Proximos 30 dias", min: new Date(em15.getTime() + 86400000), max: em30 },
      { label: "Acima de 30 dias", min: new Date(em30.getTime() + 86400000), max: null },
    ];

    const vencimento = await Promise.all(
      faixas.map(async (f) => {
        const whereReceber: any = { tipo: "RECEBER", status: { in: ["ABERTA", "VENCIDA"] } };
        const wherePagar: any = { tipo: "PAGAR", status: { in: ["ABERTA", "VENCIDA"] } };
        if (f.min) whereReceber.dataVencimento = { ...whereReceber.dataVencimento, gte: f.min };
        if (f.max) whereReceber.dataVencimento = { ...whereReceber.dataVencimento, lt: f.max };
        if (f.min) wherePagar.dataVencimento = { ...wherePagar.dataVencimento, gte: f.min };
        if (f.max) wherePagar.dataVencimento = { ...wherePagar.dataVencimento, lt: f.max };

        const [rec, pag] = await Promise.all([
          prisma.conta.aggregate({ where: whereReceber, _sum: { valor: true }, _count: true }),
          prisma.conta.aggregate({ where: wherePagar, _sum: { valor: true }, _count: true }),
        ]);
        return {
          label: f.label,
          aReceber: rec._sum.valor || 0,
          qtdReceber: rec._count,
          aPagar: pag._sum.valor || 0,
          qtdPagar: pag._count,
          saldo: (rec._sum.valor || 0) - (pag._sum.valor || 0),
        };
      })
    );

    const entradas = entradasRealizadas._sum.valor || 0;
    const saidas = saidasRealizadas._sum.valor || 0;

    return NextResponse.json({
      realizado: {
        entradas,
        saidas,
        resultado: entradas - saidas,
      },
      previsto: {
        aReceber: aReceberPrevisto._sum.valor || 0,
        aPagar: aPagarPrevisto._sum.valor || 0,
        saldoProjetado: (aReceberPrevisto._sum.valor || 0) - (aPagarPrevisto._sum.valor || 0),
      },
      vencimento,
      periodo: { dataInicio, dataFim },
    });
  } catch (error) {
    console.error("GET /api/financeiro/fluxo-caixa", error);
    return NextResponse.json({ error: "Erro ao gerar fluxo de caixa." }, { status: 500 });
  }
}
