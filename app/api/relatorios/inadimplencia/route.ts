import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthActor, assertPerfil } from "@/lib/authz";

export async function GET(req: NextRequest) {
  const actor = await getAuthActor();
  if (!actor) return NextResponse.json({ error: "Nao autorizado." }, { status: 401 });

  try {
    // Access restricted to ADMINISTRADOR and FINANCEIRO
    assertPerfil(actor, ["ADMINISTRADOR", "FINANCEIRO"]);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 403 });
  }

  try {
    const hoje = new Date();

    // Grouping RECEBER accounts in arrears (status ABERTA/VENCIDA, dataVencimento < hoje) by client ID
    const inadimplenciasAgrupadas = await prisma.conta.groupBy({
      by: ["clienteId"],
      where: {
        tipo: "RECEBER",
        status: { in: ["ABERTA", "VENCIDA"] },
        dataVencimento: { lt: hoje },
        clienteId: { not: null }
      },
      _sum: {
        valor: true,
      },
      _count: {
        id: true,
      },
      _min: {
        dataVencimento: true,
      },
    });

    const clienteIds = inadimplenciasAgrupadas.map((item) => item.clienteId as number);

    // Fetch details for the matched clients
    const clientes = await prisma.cliente.findMany({
      where: {
        id: { in: clienteIds },
      },
      select: {
        id: true,
        razaoSocial: true,
        cnpjCpf: true,
      },
    });

    const clienteMap = new Map(clientes.map((c) => [c.id, c]));

    const reportData = inadimplenciasAgrupadas
      .map((item) => {
        const cliente = clienteMap.get(item.clienteId as number);
        const dataMaisAntiga = item._min.dataVencimento;
        
        let diasEmAtraso = 0;
        if (dataMaisAntiga) {
          const diffTime = hoje.getTime() - dataMaisAntiga.getTime();
          diasEmAtraso = diffTime > 0 ? Math.floor(diffTime / (1000 * 60 * 60 * 24)) : 0;
        }

        return {
          clienteId: item.clienteId,
          razaoSocial: cliente?.razaoSocial || `Cliente #${item.clienteId}`,
          cnpjCpf: cliente?.cnpjCpf || "—",
          totalEmAberto: Number((item._sum.valor || 0).toFixed(2)),
          qtdContas: item._count.id,
          contaMaisAntiga: dataMaisAntiga ? dataMaisAntiga.toISOString().split("T")[0] : null,
          diasEmAtraso,
        };
      })
      .sort((a, b) => b.totalEmAberto - a.totalEmAberto);

    return NextResponse.json(reportData);
  } catch (error) {
    console.error("GET /api/relatorios/inadimplencia", error);
    return NextResponse.json({ error: "Erro ao carregar inadimplencia." }, { status: 500 });
  }
}
