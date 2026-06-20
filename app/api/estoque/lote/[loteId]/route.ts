import { NextRequest, NextResponse } from "next/server";
import { EstoqueService } from "@/lib/services/estoque.service";
import { getAuthActor, assertPerfil } from "@/lib/authz";

function nullableString(value: any): string | null | undefined {
  return value === undefined ? undefined : value;
}

function nullableNumber(value: any): number | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const num = Number(value);
  return isNaN(num) ? null : num;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ loteId: string }> }
) {
  const actor = await getAuthActor();
  if (!actor) return NextResponse.json({ error: "Nao autorizado." }, { status: 401 });

  try {
    assertPerfil(actor, ["ESTOQUE"]);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 403 });
  }

  try {
    const { loteId } = await params;
    const id = Number(loteId);
    if (isNaN(id)) {
      return NextResponse.json({ error: "ID do lote inválido." }, { status: 400 });
    }

    const body = await req.json();
    const { motivo } = body;

    if (!motivo || typeof motivo !== "string" || motivo.trim().length < 5) {
      return NextResponse.json(
        { error: "Informe um motivo para a alteração (mínimo 5 caracteres)." },
        { status: 400 }
      );
    }

    const data = {
      validade: body.validade !== undefined
        ? (body.validade === null ? null : new Date(body.validade))
        : undefined,
      precoCusto: nullableNumber(body.precoCusto),
      enderecoEstoque: nullableString(body.enderecoEstoque),
      numeroLote: nullableString(body.numeroLote) ?? undefined,
      fornecedorId: nullableNumber(body.fornecedorId),
    };

    const lote = await EstoqueService.editarLote(id, data, motivo, actor.usuarioId);

    return NextResponse.json(lote);
  } catch (error: any) {
    console.error("PATCH /api/estoque/lote/[loteId]", error);
    return NextResponse.json(
      { error: error.message || "Erro ao atualizar lote." },
      { status: 500 }
    );
  }
}
