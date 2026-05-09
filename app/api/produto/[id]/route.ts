import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getProdutoById, atualizarProduto, inativarProduto } from "@/lib/services/produtos.service";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
    }

    const { id } = await params;
    const produto = await getProdutoById(Number(id));

    if (!produto) {
      return NextResponse.json(
        { error: "Produto não encontrado." },
        { status: 404 }
      );
    }

    return NextResponse.json(produto);
  } catch (error) {
    console.error("GET /api/produto/[id]", error);
    return NextResponse.json(
      { error: "Erro ao buscar produto." },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();

    const produto = await atualizarProduto(Number(id), {
      codigoInterno: body.codigoInterno ?? undefined,
      codigoBarras: body.codigoBarras ?? undefined,
      descricao: body.descricao ?? undefined,
      categoria: body.categoria ?? undefined,
      fabricante: body.fabricante ?? undefined,
      unidadeVenda: body.unidadeVenda ?? undefined,
      unidadeCompra: body.unidadeCompra ?? undefined,
      fatorConversao: body.fatorConversao ? Number(body.fatorConversao) : undefined,
      registroAnvisa: body.registroAnvisa ?? undefined,
      temperaturaArmazenamento: body.temperaturaArmazenamento ?? undefined,
      controlaValidade: body.controlaValidade ?? undefined,
      controlaLote: body.controlaLote ?? undefined,
      precoCustoBase: body.precoCustoBase ? Number(body.precoCustoBase) : undefined,
      precoVendaBase: body.precoVendaBase ? Number(body.precoVendaBase) : undefined,
      estoqueMinimo: body.estoqueMinimo ? Number(body.estoqueMinimo) : undefined,
      ativo: body.ativo ?? undefined,
    });

    return NextResponse.json(produto);
  } catch (error) {
    console.error("PUT /api/produto/[id]", error);
    return NextResponse.json(
      { error: "Erro ao atualizar produto." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
    }

    const { id } = await params;
    
    await inativarProduto(Number(id));

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/produto/[id]", error);
    return NextResponse.json(
      { error: "Erro ao excluir produto." },
      { status: 500 }
    );
  }
}
