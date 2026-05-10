import { NextRequest, NextResponse } from "next/server";
import { EstoqueService } from "@/lib/services/estoque.service";
import { getAuthActor, assertPerfil } from "@/lib/authz";

export async function GET() {
  const actor = await getAuthActor();
  if (!actor) return NextResponse.json({ error: "Nao autorizado." }, { status: 401 });
  try {
    assertPerfil(actor, ["ESTOQUE"]);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 403 });
  }
  try {
    const saldo = await EstoqueService.getEstoqueAtual({});
    return NextResponse.json(saldo);
  } catch (error) {
    return NextResponse.json(
      { error: "Erro ao buscar estoque" },
      { status: 500 }
    );
  }
}

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
      quantidade,
      numeroLote,
      validade,
      localizacaoId,
      custoUnitario,
      usuarioId,
      observacao,
      fornecedorId,
      enderecoEstoque,
      status,
    } = body;

    if (!produtoId || !quantidade) {
      return NextResponse.json(
        { error: "Produto e quantidade são obrigatórios" },
        { status: 400 }
      );
    }

    const mov = await EstoqueService.registrarEntrada({
      produtoId: Number(produtoId),
      quantidade: Number(quantidade),
      numeroLote,
      validade: validade ? new Date(validade) : undefined,
      localizacaoId: localizacaoId ? Number(localizacaoId) : undefined,
      custoUnitario: custoUnitario ? Number(custoUnitario) : undefined,
      usuarioId: usuarioId ? Number(usuarioId) : undefined,
      observacao,
      fornecedorId,
      enderecoEstoque,
      status,
    });

    return NextResponse.json({ success: true, data: mov });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json(
      { error: error.message || "Erro ao salvar movimentação" },
      { status: 500 }
    );
  }
}