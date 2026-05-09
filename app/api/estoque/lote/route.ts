import { NextRequest, NextResponse } from "next/server";
import { EstoqueService } from "@/lib/services/estoque.service";

export async function GET() {
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