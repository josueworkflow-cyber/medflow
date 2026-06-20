import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthActor, assertPerfil } from "@/lib/authz";

export async function GET(req: NextRequest) {
  const actor = await getAuthActor();
  if (!actor) {
    return NextResponse.json({ error: "Nao autorizado." }, { status: 401 });
  }

  try {
    assertPerfil(actor, ["ESTOQUE", "FINANCEIRO"]);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";

    const lotes = await prisma.lote.findMany({
      where: search ? {
        OR: [
          { numeroLote: { contains: search, mode: "insensitive" } },
          { produto: { descricao: { contains: search, mode: "insensitive" } } }
        ]
      } : undefined,
      include: {
        produto: {
          select: {
            id: true,
            descricao: true,
            registroAnvisa: true,
            fabricante: true,
          }
        },
        estoqueAtual: {
          select: {
            quantidadeDisponivel: true,
            quantidadeReservada: true,
            quantidadeBloqueada: true,
          }
        }
      },
      orderBy: { validade: "asc" }
    });

    return NextResponse.json(lotes);
  } catch (error) {
    console.error("GET /api/estoque/lotes", error);
    return NextResponse.json({ error: "Erro ao buscar lotes." }, { status: 500 });
  }
}
