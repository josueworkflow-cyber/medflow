import { NextResponse } from "next/server";
import { FiscalService } from "@/lib/services/fiscal.service";
import { getAuthActor, assertPerfil } from "@/lib/authz";

export async function GET() {
  const actor = await getAuthActor();
  if (!actor) return NextResponse.json({ error: "Nao autorizado." }, { status: 401 });
  try {
    assertPerfil(actor, ["FINANCEIRO"]);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 403 });
  }
  try {
    const empresas = await FiscalService.getEmpresasFiscais();
    return NextResponse.json(empresas);
  } catch (error) {
    return NextResponse.json({ error: "Erro ao buscar empresas fiscais" }, { status: 500 });
  }
}
