import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { assertPerfil, getAuthActor } from "@/lib/authz";
import { naturezaOperacaoSchema } from "@/lib/validation/fiscal-tax";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const actor = await getAuthActor();
  if (!actor) return NextResponse.json({ error: "Nao autorizado." }, { status: 401 });
  try {
    assertPerfil(actor, ["ADMINISTRADOR"]);
    const id = Number((await params).id);
    const body = await req.json();
    const current = await prisma.naturezaOperacaoFiscal.findUnique({ where: { id } });
    if (!current) return NextResponse.json({ error: "Natureza nao encontrada." }, { status: 404 });
    const parsed = naturezaOperacaoSchema.safeParse({ ...current, ...body });
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
    const data = { ...parsed.data, codigo: parsed.data.codigo.toUpperCase() };
    const updated = await prisma.$transaction(async (tx) => {
      if (data.padrao) {
        await tx.naturezaOperacaoFiscal.updateMany({
          where: { empresaFiscalId: data.empresaFiscalId, padrao: true, id: { not: id } },
          data: { padrao: false },
        });
      }
      return tx.naturezaOperacaoFiscal.update({ where: { id }, data });
    });
    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Erro ao atualizar natureza." }, { status: 400 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const actor = await getAuthActor();
  if (!actor) return NextResponse.json({ error: "Nao autorizado." }, { status: 401 });
  try {
    assertPerfil(actor, ["ADMINISTRADOR"]);
    const id = Number((await params).id);
    await prisma.naturezaOperacaoFiscal.update({ where: { id }, data: { ativa: false, padrao: false } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Erro ao desativar natureza." }, { status: 400 });
  }
}
