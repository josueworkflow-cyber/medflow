import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const pedidos = await prisma.pedidoVenda.findMany({
      include: {
        cliente: { select: { razaoSocial: true } },
      },
      orderBy: { updatedAt: "desc" },
    });

    // Agrupar por status
    const funil = pedidos.reduce((acc: any, pedido) => {
      if (!acc[pedido.status]) acc[pedido.status] = [];
      acc[pedido.status].push(pedido);
      return acc;
    }, {});

    return NextResponse.json(funil);
  } catch (error) {
    console.error("GET /api/vendas/funil", error);
    return NextResponse.json({ error: "Erro ao buscar dados do funil." }, { status: 500 });
  }
}
