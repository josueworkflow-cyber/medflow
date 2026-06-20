import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthActor, assertPerfil } from "@/lib/authz";

export async function GET(req: NextRequest) {
  const actor = await getAuthActor();
  if (!actor) return NextResponse.json({ error: "Nao autorizado." }, { status: 401 });

  try {
    assertPerfil(actor, ["ADMINISTRADOR", "ESTOQUE"]);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const loteIdParam = searchParams.get("loteId");
    const numeroLoteParam = searchParams.get("numeroLote");

    // VALIDATION (AS REQUESTED IN OBS 2):
    // If neither loteId nor numeroLote is provided, return a clear 400 Bad Request error.
    if (!loteIdParam && !numeroLoteParam) {
      return NextResponse.json(
        { error: "Informe loteId ou numeroLote para rastrear um lote." },
        { status: 400 }
      );
    }

    const loteId = loteIdParam ? Number(loteIdParam) : null;
    const numeroLote = numeroLoteParam ? String(numeroLoteParam).trim() : null;

    let lote = null;

    if (loteId && !isNaN(loteId)) {
      lote = await prisma.lote.findUnique({
        where: { id: loteId },
        include: {
          produto: { select: { descricao: true } },
          fornecedor: { select: { razaoSocial: true } },
        },
      });
    } else if (numeroLote) {
      lote = await prisma.lote.findFirst({
        where: {
          numeroLote: { contains: numeroLote, mode: "insensitive" },
        },
        include: {
          produto: { select: { descricao: true } },
          fornecedor: { select: { razaoSocial: true } },
        },
      });
    }

    // If no batch is found, return 404
    if (!lote) {
      return NextResponse.json({ error: "Lote não encontrado no sistema." }, { status: 404 });
    }

    // Fetch all stock movements for this batch
    const movimentacoes = await prisma.movimentacaoEstoque.findMany({
      where: {
        loteId: lote.id,
      },
      include: {
        pedidoVenda: {
          select: {
            numero: true,
            cliente: {
              select: {
                razaoSocial: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    // Separate movements into entries and exits
    const entradas = movimentacoes
      .filter((m) => m.tipo === "ENTRADA")
      .map((m) => ({
        data: m.createdAt.toISOString(),
        quantidade: m.quantidade,
        origem: m.origem || m.observacao || "Entrada manual",
      }));

    const saidas = movimentacoes
      .filter((m) => m.tipo === "SAIDA")
      .map((m) => ({
        data: m.createdAt.toISOString(),
        quantidade: m.quantidade,
        pedidoNumero: m.pedidoVenda?.numero || m.destino || "Saída manual",
        cliente: m.pedidoVenda?.cliente?.razaoSocial || "—",
      }));

    // Calculate current batch stock based on EstoqueAtual records
    const estoque = await prisma.estoqueAtual.aggregate({
      where: {
        loteId: lote.id,
      },
      _sum: {
        quantidadeDisponivel: true,
        quantidadeReservada: true,
        quantidadeBloqueada: true,
      },
    });

    const saldoAtual =
      (estoque._sum.quantidadeDisponivel || 0) +
      (estoque._sum.quantidadeReservada || 0) +
      (estoque._sum.quantidadeBloqueada || 0);

    return NextResponse.json({
      lote: {
        id: lote.id,
        numeroLote: lote.numeroLote,
        validade: lote.validade ? lote.validade.toISOString() : null,
        produto: lote.produto?.descricao || "—",
        fornecedor: lote.fornecedor?.razaoSocial || "—",
      },
      entradas,
      saidas,
      saldoAtual: Number(saldoAtual.toFixed(2)),
    });
  } catch (error) {
    console.error("GET /api/relatorios/rastreabilidade-lote", error);
    return NextResponse.json({ error: "Erro ao rastrear o lote." }, { status: 500 });
  }
}
