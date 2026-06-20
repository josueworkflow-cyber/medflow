import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { assertPerfil, getAuthActor } from "@/lib/authz";
import { regraTributariaSchema } from "@/lib/validation/fiscal-tax";

async function validateOwnership(data: { empresaFiscalId: number; naturezaOperacaoId: number; cstIcms?: string | null; csosn?: string | null }) {
  const [empresa, natureza] = await Promise.all([
    prisma.empresaFiscal.findUnique({ where: { id: data.empresaFiscalId }, select: { regimeTributario: true } }),
    prisma.naturezaOperacaoFiscal.findFirst({
      where: { id: data.naturezaOperacaoId, empresaFiscalId: data.empresaFiscalId },
      select: { id: true },
    }),
  ]);
  if (!empresa) throw new Error("Empresa fiscal nao encontrada.");
  if (!natureza) throw new Error("Natureza nao pertence a empresa selecionada.");
  if (empresa.regimeTributario === "SIMPLES_NACIONAL" && !data.csosn) {
    throw new Error("Empresa do Simples Nacional exige CSOSN.");
  }
  if (empresa.regimeTributario !== "SIMPLES_NACIONAL" && !data.cstIcms) {
    throw new Error("Empresa do regime normal exige CST ICMS.");
  }
}

export async function GET(req: NextRequest) {
  const actor = await getAuthActor();
  if (!actor) return NextResponse.json({ error: "Nao autorizado." }, { status: 401 });
  try {
    assertPerfil(actor, ["FINANCEIRO"]);
    const search = new URL(req.url).searchParams;
    const empresaFiscalId = Number(search.get("empresaFiscalId"));
    const naturezaOperacaoId = search.get("naturezaOperacaoId") ? Number(search.get("naturezaOperacaoId")) : undefined;
    if (!Number.isInteger(empresaFiscalId)) {
      return NextResponse.json({ error: "Empresa fiscal e obrigatoria." }, { status: 400 });
    }
    const regras = await prisma.regraTributaria.findMany({
      where: { empresaFiscalId, naturezaOperacaoId },
      include: { produto: { select: { id: true, descricao: true, ncm: true } }, naturezaOperacao: { select: { nome: true } } },
      orderBy: [{ prioridade: "desc" }, { nome: "asc" }],
    });
    return NextResponse.json(regras);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Erro ao listar regras." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const actor = await getAuthActor();
  if (!actor) return NextResponse.json({ error: "Nao autorizado." }, { status: 401 });
  try {
    assertPerfil(actor, ["ADMINISTRADOR"]);
    const parsed = regraTributariaSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
    await validateOwnership(parsed.data);
    const regra = await prisma.regraTributaria.create({ data: parsed.data });
    return NextResponse.json(regra, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Erro ao criar regra tributaria." }, { status: 400 });
  }
}
