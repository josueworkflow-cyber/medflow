import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthActor, assertPerfil } from "@/lib/authz";

export async function POST(req: NextRequest) {
  // 1. Autenticação e Perfil
  const actor = await getAuthActor(req);
  if (!actor) {
    return NextResponse.json({ error: "Nao autorizado." }, { status: 401 });
  }

  try {
    assertPerfil(actor, ["ESTOQUE"]);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 403 });
  }

  // 2. Validar integridade do JSON enviado no corpo
  let body;
  try {
    body = await req.json();
  } catch (err) {
    return NextResponse.json(
      { error: "Body inválido." },
      { status: 400 }
    );
  }

  try {
    const { produtoId, loteId, quantidadeNova, motivo } = body;

    // 3. Validar se os campos obrigatórios estão presentes
    if (produtoId === undefined || quantidadeNova === undefined || !motivo) {
      return NextResponse.json(
        { error: "Campos produtoId, quantidadeNova e motivo são obrigatórios." },
        { status: 400 }
      );
    }

    // 4. Validar se a quantidade nova é não-negativa
    if (quantidadeNova < 0) {
      return NextResponse.json(
        { error: "A quantidadeNova não pode ser negativa." },
        { status: 400 }
      );
    }

    // 5. Buscar o registro em EstoqueAtual do produto + lote específico
    const estoqueAtual = await prisma.estoqueAtual.findFirst({
      where: {
        produtoId: Number(produtoId),
        loteId: loteId ? Number(loteId) : null,
      },
    });

    if (!estoqueAtual) {
      return NextResponse.json(
        { error: "Registro de estoque não encontrado para o produto e lote informados." },
        { status: 404 }
      );
    }

    // 6. Calcular a diferença a ajustar (delta)
    const delta = Number(quantidadeNova) - estoqueAtual.quantidadeDisponivel;

    // Utiliza verificação de tolerância para evitar problemas de imprecisão de ponto flutuante
    if (Math.abs(delta) < 0.0001) {
      return NextResponse.json(
        { error: "Quantidade igual ao saldo atual. Nenhum ajuste necessário." },
        { status: 400 }
      );
    }

    // 7. Executar a transação no banco de dados (Transacional)
    const result = await prisma.$transaction(async (tx) => {
      // A. Atualizar o saldo físico disponível
      const estoqueAtualizado = await tx.estoqueAtual.update({
        where: { id: estoqueAtual.id },
        data: {
          quantidadeDisponivel: Number(quantidadeNova),
        },
      });

      // B. Criar o registro de movimentação de estoque histórico do tipo AJUSTE
      const movimentacao = await tx.movimentacaoEstoque.create({
        data: {
          produtoId: Number(produtoId),
          loteId: loteId ? Number(loteId) : null,
          localizacaoId: estoqueAtual.localizacaoId, // Propaga a mesma localização do estoque atual
          tipo: "AJUSTE",
          quantidade: delta, // Diferença calculada (pode ser positiva ou negativa)
          observacao: motivo,
          usuarioId: actor.usuarioId,
          origem: "Ajuste de Inventário Móvel",
        },
      });

      return { estoqueAtualizado, movimentacao };
    });

    // 8. Retornar dados da movimentação criada
    return NextResponse.json(
      {
        success: true,
        movimentacao: {
          id: result.movimentacao.id,
          tipo: result.movimentacao.tipo,
          quantidade: result.movimentacao.quantidade,
        },
      },
      { status: 200 }
    );

  } catch (error) {
    console.error("Erro no endpoint POST /api/estoque/ajuste:", error);
    return NextResponse.json(
      { error: "Erro interno no servidor ao processar ajuste de estoque." },
      { status: 500 }
    );
  }
}
