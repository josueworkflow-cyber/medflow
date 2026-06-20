import { NextRequest, NextResponse } from "next/server";
import { getAuthActor } from "@/lib/authz";
import { atualizarLotesVencidos } from "@/lib/jobs/lote-vencimento.job";

export async function POST(req: NextRequest) {
  const actor = await getAuthActor();
  if (!actor) return NextResponse.json({ error: "Nao autorizado." }, { status: 401 });
  
  if (actor.perfil !== "ADMINISTRADOR") {
    return NextResponse.json({ error: "Apenas ADMINISTRADOR pode executar este job." }, { status: 403 });
  }

  try {
    await atualizarLotesVencidos();
    return NextResponse.json({ success: true, message: "Job executado com sucesso" });
  } catch (error: any) {
    console.error("POST /api/admin/jobs/atualizar-lotes-vencidos", error);
    return NextResponse.json({ error: error.message || "Erro ao executar o job." }, { status: 500 });
  }
}
