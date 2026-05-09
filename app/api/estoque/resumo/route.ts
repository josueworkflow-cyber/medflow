import { NextResponse } from "next/server";
import { EstoqueService } from "@/lib/services/estoque.service";

export async function GET() {
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
