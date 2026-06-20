import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { assertPerfil, getAuthActor } from "@/lib/authz";
import { naturezaOperacaoSchema } from "@/lib/validation/fiscal-tax";

export async function GET(req: NextRequest) {
  const actor = await getAuthActor();
  if (!actor) return NextResponse.json({ error: "Nao autorizado." }, { status: 401 });
  try {
    assertPerfil(actor, ["FINANCEIRO"]);
    const empresaFiscalId = Number(new URL(req.url).searchParams.get("empresaFiscalId"));
    if (!Number.isInteger(empresaFiscalId)) {
      return NextResponse.json({ error: "Empresa fiscal e obrigatoria." }, { status: 400 });
    }
    const naturezas = await prisma.naturezaOperacaoFiscal.findMany({
      where: { empresaFiscalId },
      include: { _count: { select: { regras: { where: { ativa: true } } } } },
      orderBy: [{ padrao: "desc" }, { nome: "asc" }],
    });
    return NextResponse.json(naturezas);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Erro ao listar naturezas." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const actor = await getAuthActor();
  if (!actor) return NextResponse.json({ error: "Nao autorizado." }, { status: 401 });
  try {
    assertPerfil(actor, ["ADMINISTRADOR"]);
    const parsed = naturezaOperacaoSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
    const data = { ...parsed.data, codigo: parsed.data.codigo.toUpperCase() };
    const natureza = await prisma.$transaction(async (tx) => {
      if (data.padrao) {
        await tx.naturezaOperacaoFiscal.updateMany({
          where: { empresaFiscalId: data.empresaFiscalId, padrao: true },
          data: { padrao: false },
        });
      }
      return tx.naturezaOperacaoFiscal.create({ data });
    });
    return NextResponse.json(natureza, { status: 201 });
  } catch (error: any) {
    const duplicate = error?.code === "P2002";
    return NextResponse.json({ error: duplicate ? "Codigo de natureza ja cadastrado." : error.message }, { status: 400 });
  }
}
