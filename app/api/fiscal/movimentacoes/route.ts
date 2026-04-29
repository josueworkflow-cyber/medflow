import { NextRequest, NextResponse } from "next/server";
import { FiscalService } from "@/lib/services/fiscal.service";

export async function GET(req: NextRequest) {
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
