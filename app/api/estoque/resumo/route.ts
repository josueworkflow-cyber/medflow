import { NextResponse } from "next/server";
import { EstoqueService } from "@/lib/services/estoque.service";

export async function GET() {
  try {
    const resumo = await EstoqueService.getEstoqueResumo();
    return NextResponse.json(resumo);
  } catch (error) {
    return NextResponse.json({ error: "Erro ao buscar resumo" }, { status: 500 });
  }
}
