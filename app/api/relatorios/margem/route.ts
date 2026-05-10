import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthActor, assertPerfil } from "@/lib/authz";

export async function GET() {
  const actor = await getAuthActor();
  if (!actor) return NextResponse.json({ error: "Nao autorizado." }, { status: 401 });
  try {
    assertPerfil(actor, ["ADMINISTRADOR"]);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 403 });
  }
  try {
    const produtos = await prisma.produto.findMany({
      where: { ativo: true, precoCustoBase: { gt: 0 }, precoVendaBase: { gt: 0 } },
      select: {
        id: true,
        codigoInterno: true,
        descricao: true,
        categoria: true,
        precoCustoBase: true,
        precoVendaBase: true,
      },
    });

    const margens = produtos.map((p) => {
      const margem = ((p.precoVendaBase - p.precoCustoBase) / p.precoVendaBase) * 100;
      const markup = ((p.precoVendaBase - p.precoCustoBase) / p.precoCustoBase) * 100;
      return {
        ...p,
        margem: Number(margem.toFixed(2)),
        markup: Number(markup.toFixed(2)),
        lucroUnitario: Number((p.precoVendaBase - p.precoCustoBase).toFixed(2)),
        status: margem < 0 ? "NEGATIVA" : margem < 10 ? "BAIXA" : margem < 30 ? "NORMAL" : "ALTA",
      };
    });

    margens.sort((a, b) => a.margem - b.margem);

    return NextResponse.json(margens);
  } catch (error) {
    console.error("GET /api/relatorios/margem", error);
    return NextResponse.json({ error: "Erro ao gerar relatório de margem." }, { status: 500 });
  }
}
