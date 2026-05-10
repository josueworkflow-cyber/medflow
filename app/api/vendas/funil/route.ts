import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthActor } from "@/lib/authz";

export async function GET() {
  const actor = await getAuthActor();
  if (!actor) return NextResponse.json({ error: "Nao autorizado." }, { status: 401 });
  try {
    const pedidos = await prisma.pedidoVenda.findMany({
      include: {
        cliente: { select: { razaoSocial: true } },
        vendedor: { select: { nome: true } },
        historico: {
          orderBy: { createdAt: "desc" },
          take: 1,
          include: { usuario: { select: { nome: true } } },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    const funil = pedidos.reduce((acc: any, pedido) => {
      if (!acc[pedido.status]) acc[pedido.status] = [];
      acc[pedido.status].push({
        ...pedido,
        ultimaAtualizacao: pedido.historico[0] || null,
      });
      return acc;
    }, {});

    return NextResponse.json(funil);
  } catch (error) {
    console.error("GET /api/vendas/funil", error);
    return NextResponse.json({ error: "Erro ao buscar dados do funil." }, { status: 500 });
  }
}
