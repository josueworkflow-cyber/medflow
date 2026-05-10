import { NextRequest, NextResponse } from "next/server";
import { getProdutos, criarProduto } from "@/lib/services/produtos.service";
import { getAuthActor, assertPerfil } from "@/lib/authz";

export async function GET() {
  const actor = await getAuthActor();
  if (!actor) return NextResponse.json({ error: "Nao autorizado." }, { status: 401 });
  try {
    assertPerfil(actor, ["VENDAS", "ESTOQUE"]);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 403 });
  }
  try {
    const produtos = await getProdutos();
    return NextResponse.json(produtos);
  } catch (error) {
    console.error("GET /api/produto", error);
    return NextResponse.json(
      { error: "Erro ao buscar produtos." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const actor = await getAuthActor();
  if (!actor) return NextResponse.json({ error: "Nao autorizado." }, { status: 401 });
  try {
    assertPerfil(actor, ["VENDAS", "ESTOQUE"]);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 403 });
  }
  try {
    const body = await req.json();

    if (!body.descricao) {
      return NextResponse.json({ error: "Descricao e obrigatoria." }, { status: 400 });
    }

    const produto = await criarProduto({
      codigoInterno: body.codigoInterno || null,
      codigoBarras: body.codigoBarras || null,
      descricao: body.descricao,
      categoria: body.categoria || null,
      fabricante: body.fabricante || null,
      unidadeVenda: body.unidadeVenda || "UN",
      unidadeCompra: body.unidadeCompra || null,
      fatorConversao: Number(body.fatorConversao || 1),
      registroAnvisa: body.registroAnvisa || null,
      temperaturaArmazenamento: body.temperaturaArmazenamento || null,
      controlaValidade: Boolean(body.controlaValidade),
      controlaLote: Boolean(body.controlaLote),
      precoCustoBase: Number(body.precoCustoBase || 0),
      precoVendaBase: Number(body.precoVendaBase || 0),
      estoqueMinimo: Number(body.estoqueMinimo || 0),
      ativo: true,
    });

    return NextResponse.json(produto, { status: 201 });
  } catch (error) {
    console.error("POST /api/produto", error);
    return NextResponse.json(
      { error: "Erro ao cadastrar produto." },
      { status: 500 }
    );
  }
}
