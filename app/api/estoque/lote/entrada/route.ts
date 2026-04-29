import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { TipoMovimentacao } from "@prisma/client";

export async function POST(req: NextRequest) {
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

    if (!produtoId || !quantidade || !codigoLote) {
      return NextResponse.json(
        { error: "Produto, lote e quantidade são obrigatórios" },
        { status: 400 }
      );
    }

    const qtd = Number(quantidade);
    if (qtd <= 0) {
      return NextResponse.json(
        { error: "Quantidade deve ser maior que zero" },
        { status: 400 }
      );
    }

    // 1. Garantir que o lote existe (upsert)
    const lote = await prisma.lote.upsert({
      where: {
        numeroLote_produtoId: {
          numeroLote: codigoLote.trim(),
          produtoId: Number(produtoId),
        },
      },
      update: {
        validade: validade ? new Date(validade) : undefined,
      },
      create: {
        numeroLote: codigoLote.trim(),
        validade: validade ? new Date(validade) : null,
        produtoId: Number(produtoId),
      },
    });

    // 2. Criar a movimentação de ENTRADA
    await prisma.movimentacaoEstoque.create({
      data: {
        produtoId: Number(produtoId),
        loteId: lote.id,
        tipo: "ENTRADA",
        quantidade: qtd,
        observacao: observacao || "Entrada manual via formulário",
        usuario: "Administrador",
      },
    });

    // 3. Atualizar o EstoqueAtual
    const estoqueExistente = await prisma.estoqueAtual.findFirst({
      where: {
        produtoId: Number(produtoId),
        loteId: lote.id,
      },
    });

    if (estoqueExistente) {
      await prisma.estoqueAtual.update({
        where: { id: estoqueExistente.id },
        data: {
          quantidadeDisponivel: { increment: qtd },
        },
      });
    } else {
      await prisma.estoqueAtual.create({
        data: {
          produtoId: Number(produtoId),
          loteId: lote.id,
          quantidadeDisponivel: qtd,
        },
      });
    }

    // 4. Se houver custo unitário, atualizar no cadastro do produto (opcional/regra de negócio)
    if (custoUnitario) {
      await prisma.produto.update({
        where: { id: Number(produtoId) },
        data: { precoCustoBase: Number(custoUnitario) },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erro na entrada de estoque:", error);
    return NextResponse.json(
      { error: "Falha ao processar entrada de estoque" },
      { status: 500 }
    );
  }
}
