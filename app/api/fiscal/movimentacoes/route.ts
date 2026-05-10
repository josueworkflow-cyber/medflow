import { NextRequest, NextResponse } from "next/server";
import { FiscalService } from "@/lib/services/fiscal.service";
import { getAuthActor, assertPerfil } from "@/lib/authz";

export async function GET(req: NextRequest) {
  const actor = await getAuthActor();
  if (!actor) return NextResponse.json({ error: "Nao autorizado." }, { status: 401 });
  try {
    assertPerfil(actor, ["FINANCEIRO"]);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 403 });
  }
  try {
    const { searchParams } = new URL(req.url);
    const empresaFiscalId = searchParams.get('empresaFiscalId');
    
    const movs = await FiscalService.getMovimentacoesFiscais({
      empresaFiscalId: empresaFiscalId ? Number(empresaFiscalId) : undefined
    });

    return NextResponse.json(movs);
  } catch (error) {
    return NextResponse.json({ error: "Erro ao buscar movimentações fiscais" }, { status: 500 });
  }
}
