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
      codigoProdutoLegado,
      nomeProdutoOrigem,
      fornecedorOrigem,
      fornecedorLegadoId,
      marcaOrigem,
      gtinOrigem,
      unidadeOrigem,
      situacaoOrigem,
      observacoesOrigem,
      estoqueMinimoOrigem,
      estoqueMaximoOrigem,
      valorVendaOrigem,
      valorCustoOrigem,
      linhaFonteOrigem,
      fonteImportacao,
      dadosOrigem,
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
      codigoProdutoLegado: codigoProdutoLegado || undefined,
      nomeProdutoOrigem: nomeProdutoOrigem || undefined,
      fornecedorOrigem: fornecedorOrigem || undefined,
      fornecedorLegadoId: fornecedorLegadoId || undefined,
      marcaOrigem: marcaOrigem || undefined,
      gtinOrigem: gtinOrigem || undefined,
      unidadeOrigem: unidadeOrigem || undefined,
      situacaoOrigem: situacaoOrigem || undefined,
      observacoesOrigem: observacoesOrigem || undefined,
      estoqueMinimoOrigem: estoqueMinimoOrigem !== undefined ? Number(estoqueMinimoOrigem) : undefined,
      estoqueMaximoOrigem: estoqueMaximoOrigem !== undefined ? Number(estoqueMaximoOrigem) : undefined,
      valorVendaOrigem: valorVendaOrigem !== undefined ? Number(valorVendaOrigem) : undefined,
      valorCustoOrigem: valorCustoOrigem !== undefined ? Number(valorCustoOrigem) : undefined,
      linhaFonteOrigem: linhaFonteOrigem !== undefined ? Number(linhaFonteOrigem) : undefined,
      fonteImportacao: fonteImportacao || undefined,
      dadosOrigem: dadosOrigem || undefined,
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
