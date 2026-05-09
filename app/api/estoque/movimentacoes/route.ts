import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const params = req.nextUrl.searchParams;
    const filtroTipo = params.get("tipo");
    const produto = params.get("produto");
    const pedido = params.get("pedido");
    const usuario = params.get("usuario");
    const lote = params.get("lote");
    const empresaFiscal = params.get("empresaFiscal");
    const origem = params.get("origem");
    const tipoPedido = params.get("tipoPedido");
    const dataInicio = params.get("dataInicio");
    const dataFim = params.get("dataFim");

    const where: any = {};

    if (filtroTipo && filtroTipo !== "TODOS") {
      const tipos = filtroTipo.split(",");
      if (tipos.length === 1) {
        where.tipo = tipos[0];
      } else {
        where.tipo = { in: tipos };
      }
    }

    if (produto) {
      const produtos = await prisma.produto.findMany({
        where: { descricao: { contains: produto, mode: "insensitive" } },
        select: { id: true },
      });
      where.produtoId = { in: produtos.map((p) => p.id) };
    }

    if (pedido) {
      const pedidos = await prisma.pedidoVenda.findMany({
        where: { numero: { contains: pedido, mode: "insensitive" } },
        select: { id: true },
      });
      where.pedidoVendaId = { in: [...pedidos.map((p) => p.id), -1] };
    }

    if (usuario) {
      const usuarios = await prisma.usuario.findMany({
        where: { nome: { contains: usuario, mode: "insensitive" } },
        select: { id: true },
      });
      where.usuarioId = { in: usuarios.map((u) => u.id) };
    }

    if (lote) {
      where.lote = { numeroLote: { contains: lote, mode: "insensitive" } };
    }

    if (empresaFiscal) {
      const empresas = await prisma.empresaFiscal.findMany({
        where: {
          OR: [
            { razaoSocial: { contains: empresaFiscal, mode: "insensitive" } },
            { nomeFantasia: { contains: empresaFiscal, mode: "insensitive" } },
          ],
        },
        select: { id: true },
      });
      where.empresaFiscalId = { in: empresas.map((e) => e.id) };
    }

    if (origem) {
      where.origem = { contains: origem, mode: "insensitive" };
    }

    if (tipoPedido) {
      where.pedidoVenda = { tipoPedido };
    }

    if (dataInicio) {
      where.createdAt = { ...(where.createdAt || {}), gte: new Date(dataInicio) };
    }
    if (dataFim) {
      const fim = new Date(dataFim);
      fim.setHours(23, 59, 59, 999);
      where.createdAt = { ...(where.createdAt || {}), lte: fim };
    }

    const [movimentacoes, totais] = await Promise.all([
      prisma.movimentacaoEstoque.findMany({
        where,
        include: {
          produto: { select: { descricao: true, codigoInterno: true } },
          lote: { select: { numeroLote: true, validade: true } },
          localizacao: { select: { nome: true } },
          usuarioRef: { select: { nome: true } },
          empresaFiscal: { select: { nomeFantasia: true, razaoSocial: true } },
          pedidoVenda: {
            select: {
              numero: true,
              tipoPedido: true,
              cliente: { select: { razaoSocial: true } },
            },
          },
          movimentacaoFiscal: {
            select: {
              documentoFiscal: { select: { numero: true, tipo: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 200,
      }),
      // KPIs
      (async () => {
        const hoje = new Date();
        const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
        const inicioDia = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());

        const baseFilter: any = {};
        if (Object.keys(where).length > 0) {
          Object.assign(baseFilter, where);
        }

        const [
          entradasMes, saidasMes, reservasMes, ajustesMes, movDia
        ] = await Promise.all([
          prisma.movimentacaoEstoque.count({
            where: { ...baseFilter, tipo: "ENTRADA", createdAt: { gte: inicioMes } },
          }),
          prisma.movimentacaoEstoque.count({
            where: { ...baseFilter, tipo: "SAIDA", createdAt: { gte: inicioMes } },
          }),
          prisma.movimentacaoEstoque.count({
            where: { ...baseFilter, tipo: "RESERVA", createdAt: { gte: inicioMes } },
          }),
          prisma.movimentacaoEstoque.count({
            where: { ...baseFilter, tipo: { in: ["AJUSTE", "PERDA"] }, createdAt: { gte: inicioMes } },
          }),
          prisma.movimentacaoEstoque.count({
            where: { ...baseFilter, createdAt: { gte: inicioDia } },
          }),
        ]);

        return { entradasMes, saidasMes, reservasMes, ajustesMes, movDia };
      })(),
    ]);

    return NextResponse.json({ movimentacoes, totais });
  } catch (error) {
    console.error("GET /api/estoque/movimentacoes", error);
    return NextResponse.json({ error: "Erro ao buscar movimentacoes." }, { status: 500 });
  }
}
