import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthActor } from "@/lib/authz";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const actor = await getAuthActor();
  if (!actor) return NextResponse.json({ error: "Nao autorizado." }, { status: 401 });
  try {
    const { id } = await params;
    const historico = await prisma.historicoPedido.findMany({
      where: { pedidoVendaId: Number(id) },
      include: {
        usuario: { select: { nome: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(historico);
  } catch (error) {
    console.error("GET /api/vendas/[id]/historico", error);
    return NextResponse.json({ error: "Erro ao buscar historico." }, { status: 500 });
  }
}
