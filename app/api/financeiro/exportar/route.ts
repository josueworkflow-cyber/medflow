import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const inicio = req.nextUrl.searchParams.get("inicio");
    const fim = req.nextUrl.searchParams.get("fim");

    if (!inicio || !fim) {
      return NextResponse.json({ error: "Período obrigatório." }, { status: 400 });
    }

    const dInicio = new Date(inicio);
    const dFim = new Date(fim);
    dFim.setHours(23, 59, 59);

    const vendas = await prisma.pedidoVenda.findMany({
      where: {
        createdAt: { gte: dInicio, lte: dFim },
        status: { in: ["FATURADO", "ENTREGUE"] }
      },
      include: { cliente: true }
    });

    // Gerar CSV Simples
    let csv = "ID;Data;Cliente;CNPJ/CPF;ValorTotal;Status\n";
    vendas.forEach(v => {
      csv += `${v.id};${v.createdAt.toISOString()};${v.cliente.razaoSocial};${v.cliente.cnpjCpf};${v.valorTotal};${v.status}\n`;
    });

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="MEDFLOW_CONTABIL_${inicio}_${fim}.csv"`,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: "Erro ao exportar." }, { status: 500 });
  }
}
