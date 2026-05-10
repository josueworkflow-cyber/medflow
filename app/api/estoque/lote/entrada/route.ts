import { NextRequest, NextResponse } from "next/server";
import { getAuthActor, assertPerfil } from "@/lib/authz";
import { EstoqueService } from "@/lib/services/estoque.service";

export async function POST(req: NextRequest) {
  const actor = await getAuthActor();
  if (!actor) return NextResponse.json({ error: "Nao autorizado." }, { status: 401 });
  try {
    assertPerfil(actor, ["ESTOQUE"]);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 403 });
  }
  try {
    const body = await req.json();
    const {
      produtoId,
      codigoLote,
      validade,
      quantidade,
      custoUnitario,
      observacao,
    } = body;

    if (!produtoId || !quantidade) {
      return NextResponse.json(
        { error: "Produto e quantidade sao obrigatorios." },
        { status: 400 }
      );
    }

    const qtd = Number(quantidade);
    if (qtd <= 0) {
      return NextResponse.json(
        { error: "Quantidade deve ser maior que zero." },
        { status: 400 }
      );
    }

    await EstoqueService.registrarEntrada({
      produtoId: Number(produtoId),
      quantidade: qtd,
      numeroLote: codigoLote?.trim() || undefined,
      validade: validade ? new Date(validade) : undefined,
      custoUnitario: custoUnitario ? Number(custoUnitario) : undefined,
      observacao: observacao || undefined,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Erro na entrada de estoque:", error);
    const status = error.message?.includes("obrigat") ? 400 : 500;
    return NextResponse.json(
      { error: error.message || "Falha ao processar entrada de estoque." },
      { status }
    );
  }
}
