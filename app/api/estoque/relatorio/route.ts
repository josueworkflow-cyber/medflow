import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthActor, assertPerfil } from "@/lib/authz";

export async function GET() {
  const actor = await getAuthActor();
  if (!actor) return NextResponse.json({ error: "Nao autorizado." }, { status: 401 });
  try {
    assertPerfil(actor, ["ESTOQUE"]);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 403 });
  }
  try {
    const relatorio = await prisma.estoqueAtual.findMany({
      include: {
        produto: true,
        lote: true,
        localizacao: true
      }
    });
    return NextResponse.json(relatorio);
  } catch (error) {
    return NextResponse.json({ error: "Erro ao gerar relatório físico" }, { status: 500 });
  }
}
