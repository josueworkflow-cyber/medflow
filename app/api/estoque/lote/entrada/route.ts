import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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

    const produto = await prisma.produto.findUnique({ where: { id: Number(produtoId) } });
    if (!produto) {
      return NextResponse.json({ error: "Produto nao encontrado." }, { status: 404 });
    }
    if (produto.controlaLote && !codigoLote?.trim()) {
      return NextResponse.json({ error: "Lote e obrigatorio para este produto." }, { status: 400 });
    }
    if (produto.controlaValidade && !validade) {
      return NextResponse.json({ error: "Validade e obrigatoria para este produto." }, { status: 400 });
    }

    const lote = codigoLote?.trim()
      ? await prisma.lote.upsert({
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
        })
      : null;

    await prisma.$transaction(async (tx) => {
      await tx.movimentacaoEstoque.create({
        data: {
          produtoId: Number(produtoId),
          loteId: lote?.id,
          tipo: "ENTRADA",
          quantidade: qtd,
          observacao: observacao || "Entrada operacional",
          usuario: "Administrador",
        },
      });

      const estoqueExistente = await tx.estoqueAtual.findFirst({
        where: {
          produtoId: Number(produtoId),
          loteId: lote?.id ?? null,
        },
      });

      if (estoqueExistente) {
        await tx.estoqueAtual.update({
          where: { id: estoqueExistente.id },
          data: { quantidadeDisponivel: { increment: qtd } },
        });
      } else {
        await tx.estoqueAtual.create({
          data: {
            produtoId: Number(produtoId),
            loteId: lote?.id,
            quantidadeDisponivel: qtd,
            custoUnitario: custoUnitario ? Number(custoUnitario) : 0,
          },
        });
      }

      if (custoUnitario) {
        await tx.produto.update({
          where: { id: Number(produtoId) },
          data: { precoCustoBase: Number(custoUnitario) },
        });
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erro na entrada de estoque:", error);
    return NextResponse.json(
      { error: "Falha ao processar entrada de estoque." },
      { status: 500 }
    );
  }
}
