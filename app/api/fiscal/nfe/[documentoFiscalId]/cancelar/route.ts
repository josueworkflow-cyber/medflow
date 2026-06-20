import { NextRequest, NextResponse } from "next/server";
import { getAuthActor, assertPerfil } from "@/lib/authz";
import { cancelarNFe } from "@/lib/services/fiscal/nfe/nfe-cancelamento.service";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ documentoFiscalId: string }> }
) {
  const actor = await getAuthActor();
  if (!actor) {
    return NextResponse.json({ error: "Nao autorizado." }, { status: 401 });
  }

  try {
    assertPerfil(actor, ["FINANCEIRO", "ADMINISTRADOR"]);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 403 });
  }

  try {
    const { documentoFiscalId } = await params;
    const docId = Number(documentoFiscalId);

    if (isNaN(docId)) {
      return NextResponse.json({ error: "ID de documento fiscal inválido." }, { status: 400 });
    }

    const { motivo } = await req.json();
    if (!motivo) {
      return NextResponse.json({ error: "O motivo do cancelamento é obrigatório." }, { status: 400 });
    }

    await cancelarNFe(docId, motivo, actor.usuarioId);

    return NextResponse.json({ success: true, message: "NF-e cancelada com sucesso" });
  } catch (error: any) {
    const message = error.message || "Erro inesperado ao cancelar NF-e.";
    
    // Distinção entre indisponibilidade (503) e rejeição/erro de validação (400)
    if (message.includes("Serviço SEFAZ indisponível")) {
      return NextResponse.json({ error: message }, { status: 503 });
    }
    
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
