import { NextRequest, NextResponse } from "next/server";
import { EstoqueService } from "@/lib/services/estoque.service";
import { getAuthActor, assertPerfil } from "@/lib/authz";

export async function POST(req: NextRequest) {
  // 1. Autenticação e Perfil
  const actor = await getAuthActor(req);
  if (!actor) {
    return NextResponse.json({ error: "Nao autorizado." }, { status: 401 });
  }

  try {
    assertPerfil(actor, ["ESTOQUE"]);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 403 });
  }

  // 2. Validar integridade do JSON enviado no corpo
  let body;
  try {
    body = await req.json();
  } catch (err) {
    return NextResponse.json(
      { error: "Body inválido." },
      { status: 400 }
    );
  }

  try {
    const { loteId, produtoId, localizacaoOrigemId, localizacaoDestinoId, quantidade, motivo } = body;

    // 3. Validar presença dos campos obrigatórios
    if (
      loteId === undefined ||
      produtoId === undefined ||
      localizacaoOrigemId === undefined ||
      localizacaoDestinoId === undefined ||
      quantidade === undefined ||
      !motivo
    ) {
      return NextResponse.json(
        { error: "Campos produtoId, loteId, localizacaoOrigemId, localizacaoDestinoId, quantidade e motivo são obrigatórios." },
        { status: 400 }
      );
    }

    // 4. Validar quantidade > 0
    if (quantidade <= 0) {
      return NextResponse.json(
        { error: "A quantidade deve ser maior que zero." },
        { status: 400 }
      );
    }

    // 5. Validar localizacaoOrigemId !== localizacaoDestinoId
    if (Number(localizacaoOrigemId) === Number(localizacaoDestinoId)) {
      return NextResponse.json(
        { error: "Origem e destino não podem ser iguais." },
        { status: 400 }
      );
    }

    // 6. Chamar o serviço de transferência
    const result = await EstoqueService.transferirLote({
      loteId: Number(loteId),
      produtoId: Number(produtoId),
      localizacaoOrigemId: Number(localizacaoOrigemId),
      localizacaoDestinoId: Number(localizacaoDestinoId),
      quantidade: Number(quantidade),
      motivo,
      usuarioId: actor.usuarioId,
    });

    return NextResponse.json(result, { status: 200 });

  } catch (error: any) {
    // Tratar erros conhecidos retornados pelo service com status 400
    const errosConhecidos = [
      "Estoque de origem não encontrado.",
      "Quantidade insuficiente no estoque de origem."
    ];

    if (error instanceof Error && errosConhecidos.includes(error.message)) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.error("Erro no endpoint POST /api/estoque/transferencia:", error);
    return NextResponse.json(
      { error: "Erro interno no servidor ao processar transferência." },
      { status: 500 }
    );
  }
}
