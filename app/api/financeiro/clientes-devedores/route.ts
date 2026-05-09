import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const hoje = new Date();
    const hojeDate = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
    const em7 = new Date(hojeDate); em7.setDate(em7.getDate() + 7);

    const clientesComContas = await prisma.cliente.findMany({
      where: {
        contasReceber: {
          some: { status: { in: ["ABERTA", "VENCIDA"] } },
        },
      },
      include: {
        contasReceber: {
          where: { status: { in: ["ABERTA", "VENCIDA"] } },
          select: {
            id: true,
            valor: true,
            valorPago: true,
            status: true,
            dataVencimento: true,
            dataPagamento: true,
            parcelaNumero: true,
            parcelaTotal: true,
            pedidoVendaId: true,
            pedidoVenda: { select: { numero: true } },
          },
        },
        _count: { select: { pedidosVenda: true } },
      },
    });

    const resultado = clientesComContas.map((c) => {
      const abertas = c.contasReceber;
      const vencidas = abertas.filter((co) => co.status === "VENCIDA");
      const aVencer = abertas.filter((co) => co.status === "ABERTA" && new Date(co.dataVencimento) >= hojeDate);
      const vence7d = aVencer.filter((co) => {
        const diff = new Date(co.dataVencimento).getTime() - hojeDate.getTime();
        return diff > 0 && diff <= 7 * 24 * 60 * 60 * 1000;
      });

      const ultimoPagamento = abertas.reduce((max, co) => {
        if (co.dataPagamento && new Date(co.dataPagamento) > max) return new Date(co.dataPagamento);
        return max;
      }, new Date(0));

      const totalAberto = abertas.reduce((s, co) => s + co.valor - co.valorPago, 0);
      const totalVencido = vencidas.reduce((s, co) => s + co.valor - co.valorPago, 0);
      const totalAVencer = aVencer.reduce((s, co) => s + co.valor - co.valorPago, 0);

      return {
        id: c.id,
        razaoSocial: c.razaoSocial,
        cnpjCpf: c.cnpjCpf,
        limiteCredito: c.limiteCredito,
        totalAberto: Math.round(totalAberto * 100) / 100,
        totalVencido: Math.round(totalVencido * 100) / 100,
        totalAVencer: Math.round(totalAVencer * 100) / 100,
        venceEm7Dias: Math.round(vence7d.reduce((s, co) => s + co.valor - co.valorPago, 0) * 100) / 100,
        ultimoPagamento: ultimoPagamento.getTime() > 0 ? ultimoPagamento.toISOString() : null,
        parcelasAbertas: abertas.length,
        parcelasVencidas: vencidas.length,
        pedidosVinculados: [...new Set(abertas.map((co) => co.pedidoVenda?.numero).filter(Boolean))],
      };
    });

    resultado.sort((a, b) => b.totalAberto - a.totalAberto);

    return NextResponse.json(resultado);
  } catch (error) {
    console.error("GET /api/financeiro/clientes-devedores", error);
    return NextResponse.json({ error: "Erro ao buscar clientes devedores." }, { status: 500 });
  }
}
