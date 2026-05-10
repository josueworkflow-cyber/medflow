import { NextResponse } from "next/server";
import { EstoqueService } from "@/lib/services/estoque.service";
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
    const resumo = await EstoqueService.getEstoqueResumo();
    return NextResponse.json(resumo);
  } catch (error) {
    console.error("Erro na API /api/estoque/resumo:", error);
    return NextResponse.json({ 
      error: "Erro ao buscar resumo",
      fisicoTotal: 0,
      reservados: 0,
      vencendo: 0,
      semAlocacaoFiscal: 0,
      faturadoNoMes: 0
    }, { status: 500 });
  }
}
