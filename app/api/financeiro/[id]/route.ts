import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { StatusConta } from "@prisma/client";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const conta = await prisma.conta.findUnique({
      where: { id: Number(id) },
      include: {
        cliente: { select: { razaoSocial: true } },
        fornecedor: { select: { razaoSocial: true } },
        pedidoVenda: { select: { numero: true } },
        historicoPagamentos: { orderBy: { data: "desc" } },
      },
    });
    if (!conta) return NextResponse.json({ error: "Conta nao encontrada." }, { status: 404 });
    return NextResponse.json(conta);
  } catch (error) {
    console.error("GET /api/financeiro/[id]", error);
    return NextResponse.json({ error: "Erro ao buscar conta." }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const conta = await prisma.conta.findUnique({ where: { id: Number(id) } });
    if (!conta) return NextResponse.json({ error: "Conta nao encontrada." }, { status: 404 });

    // Baixa financeira: registrar pagamento/recebimento
    if (body.acao === "baixa") {
      const valorBaixa = Number(body.valor) || 0;
      const dataBaixa = body.data ? new Date(body.data) : new Date();
      const forma = body.formaPagamento || conta.formaPagamento;
      const observacao = body.observacao || "";

      if (valorBaixa <= 0) {
        return NextResponse.json({ error: "Valor da baixa invalido." }, { status: 400 });
      }

      const saldoAberto = conta.valor - conta.valorPago;
      if (valorBaixa > saldoAberto) {
        return NextResponse.json({ error: "Valor da baixa excede o saldo em aberto." }, { status: 400 });
      }

      const novoValorPago = conta.valorPago + valorBaixa;
      const novoSaldo = conta.valor - novoValorPago;
      let novoStatus: StatusConta = conta.status;

      if (Math.abs(novoSaldo) < 0.01) {
        novoStatus = "PAGA";
      } else if (novoSaldo < conta.valor) {
        novoStatus = "ABERTA";
      }

      const hoje = new Date();
      if (novoStatus === "ABERTA" && new Date(conta.dataVencimento) < hoje) {
        novoStatus = "VENCIDA";
      }

      await prisma.$transaction([
        prisma.conta.update({
          where: { id: Number(id) },
          data: {
            valorPago: novoValorPago,
            status: novoStatus,
            dataPagamento: novoStatus === "PAGA" ? dataBaixa : conta.dataPagamento,
            formaPagamento: forma,
          },
        }),
        prisma.historicoPagamento.create({
          data: {
            contaId: Number(id),
            valor: valorBaixa,
            data: dataBaixa,
            formaPagamento: forma,
            observacao: observacao || "Baixa financeira",
          },
        }),
      ]);

      const updated = await prisma.conta.findUnique({
        where: { id: Number(id) },
        include: {
          historicoPagamentos: { orderBy: { data: "desc" } },
          cliente: { select: { razaoSocial: true } },
          fornecedor: { select: { razaoSocial: true } },
          pedidoVenda: { select: { numero: true } },
        },
      });

      return NextResponse.json(updated);
    }

    // Edicao normal de dados
    const data: Record<string, unknown> = {};
    if (body.status) data.status = body.status;
    if (body.dataVencimento) data.dataVencimento = new Date(body.dataVencimento);
    if (body.observacao !== undefined) data.observacao = body.observacao;
    if (body.descricao !== undefined) data.descricao = body.descricao;
    if (body.formaPagamento !== undefined) data.formaPagamento = body.formaPagamento;
    if (body.categoria !== undefined) data.categoria = body.categoria;
    if (body.dataPagamento) data.dataPagamento = new Date(body.dataPagamento);

    if (body.status === "PAGA" && !body.dataPagamento) {
      data.dataPagamento = new Date();
      data.valorPago = conta.valor;
    }

    const updated = await prisma.conta.update({
      where: { id: Number(id) },
      data,
      include: {
        historicoPagamentos: { orderBy: { data: "desc" } },
        cliente: { select: { razaoSocial: true } },
        fornecedor: { select: { razaoSocial: true } },
        pedidoVenda: { select: { numero: true } },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PUT /api/financeiro/[id]", error);
    return NextResponse.json({ error: "Erro ao atualizar conta." }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.conta.update({
      where: { id: Number(id) },
      data: { status: "CANCELADA" },
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/financeiro/[id]", error);
    return NextResponse.json({ error: "Erro ao cancelar conta." }, { status: 500 });
  }
}
