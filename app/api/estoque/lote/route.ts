import { NextRequest, NextResponse } from "next/server";
import { EstoqueService } from "@/lib/services/estoque.service";
import { getAuthActor, assertPerfil } from "@/lib/authz";

import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const actor = await getAuthActor();
  if (!actor) return NextResponse.json({ error: "Nao autorizado." }, { status: 401 });
  try {
    assertPerfil(actor, ["ESTOQUE"]);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 403 });
  }
  try {
    const { searchParams } = new URL(req.url);
    const produtoId = searchParams.get("produtoId");
    const numeroLote = searchParams.get("numeroLote");

    if (produtoId && numeroLote) {
      const lote = await prisma.lote.findUnique({
        where: {
          numeroLote_produtoId: {
            numeroLote,
            produtoId: Number(produtoId)
          }
        }
      });
      return NextResponse.json(lote);
    }

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

    return NextResponse.json({ success: true, data: mov });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json(
      { error: error.message || "Erro ao salvar movimentação" },
      { status: 500 }
    );
  }
}
