import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getProdutos, criarProduto } from "@/lib/services/produtos.service";

export async function GET() {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
    }

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
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
    }

    const body = await req.json();
    
    if (!body.descricao) {
      return NextResponse.json({ error: "Descrição é obrigatória." }, { status: 400 });
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