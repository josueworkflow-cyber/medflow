import { NextRequest, NextResponse } from "next/server";
import { FiscalService } from "@/lib/services/fiscal.service";

export async function GET(req: NextRequest) {
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
