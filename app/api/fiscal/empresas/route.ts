import { NextResponse } from "next/server";
import { FiscalService } from "@/lib/services/fiscal.service";

export async function GET() {
  try {
    const empresas = await FiscalService.getEmpresasFiscais();
    return NextResponse.json(empresas);
  } catch (error) {
    return NextResponse.json({ error: "Erro ao buscar empresas fiscais" }, { status: 500 });
  }
}
