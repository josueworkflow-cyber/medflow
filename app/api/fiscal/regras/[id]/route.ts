import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { assertPerfil, getAuthActor } from "@/lib/authz";
import { regraTributariaSchema } from "@/lib/validation/fiscal-tax";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const actor = await getAuthActor();
  if (!actor) return NextResponse.json({ error: "Nao autorizado." }, { status: 401 });
  try {
    assertPerfil(actor, ["ADMINISTRADOR"]);
    const id = Number((await params).id);
    const current = await prisma.regraTributaria.findUnique({ where: { id } });
    if (!current) return NextResponse.json({ error: "Regra nao encontrada." }, { status: 404 });
    const parsed = regraTributariaSchema.safeParse({ ...current, ...await req.json() });
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
    const [natureza, empresa] = await Promise.all([
      prisma.naturezaOperacaoFiscal.findFirst({
        where: { id: parsed.data.naturezaOperacaoId, empresaFiscalId: parsed.data.empresaFiscalId },
        select: { id: true },
      }),
      prisma.empresaFiscal.findUnique({
        where: { id: parsed.data.empresaFiscalId },
        select: { regimeTributario: true },
      }),
    ]);
    if (!natureza) return NextResponse.json({ error: "Natureza nao pertence a empresa selecionada." }, { status: 400 });
    if (empresa?.regimeTributario === "SIMPLES_NACIONAL" && !parsed.data.csosn) {
      return NextResponse.json({ error: "Empresa do Simples Nacional exige CSOSN." }, { status: 400 });
    }
    if (empresa?.regimeTributario !== "SIMPLES_NACIONAL" && !parsed.data.cstIcms) {
      return NextResponse.json({ error: "Empresa do regime normal exige CST ICMS." }, { status: 400 });
    }
    const updated = await prisma.regraTributaria.update({ where: { id }, data: parsed.data });
    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Erro ao atualizar regra tributaria." }, { status: 400 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const actor = await getAuthActor();
  if (!actor) return NextResponse.json({ error: "Nao autorizado." }, { status: 401 });
  try {
    assertPerfil(actor, ["ADMINISTRADOR"]);
    const id = Number((await params).id);
    await prisma.regraTributaria.update({ where: { id }, data: { ativa: false } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Erro ao desativar regra tributaria." }, { status: 400 });
  }
}
