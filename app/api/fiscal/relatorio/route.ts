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
    const dataInicio = searchParams.get('dataInicio');
    const dataFim = searchParams.get('dataFim');

    const relatorio = await FiscalService.getRelatorioFiscal({
      dataInicio: dataInicio ? new Date(dataInicio) : new Date(new Date().getFullYear(), new Date().getMonth(), 1),
      dataFim: dataFim ? new Date(dataFim) : new Date()
    });

    return NextResponse.json(relatorio);
  } catch (error) {
    return NextResponse.json({ error: "Erro ao gerar relatório fiscal" }, { status: 500 });
  }
}
