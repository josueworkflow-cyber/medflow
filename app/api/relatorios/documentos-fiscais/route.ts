import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthActor, assertPerfil } from "@/lib/authz";
import { parseDateParam } from "@/lib/relatorios/date-helpers";

export async function GET(req: NextRequest) {
  const actor = await getAuthActor();
  if (!actor) return NextResponse.json({ error: "Nao autorizado." }, { status: 401 });

  try {
    // Access restricted to ADMINISTRADOR and FINANCEIRO
    assertPerfil(actor, ["ADMINISTRADOR", "FINANCEIRO"]);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const dataInicioStr = searchParams.get("dataInicio");
    const dataFimStr = searchParams.get("dataFim");
    const empresaFiscalIdStr = searchParams.get("empresaFiscalId");

    const start = parseDateParam(dataInicioStr, false);
    const end = parseDateParam(dataFimStr, true);

    const empresaFiscalId = empresaFiscalIdStr && !isNaN(Number(empresaFiscalIdStr))
      ? Number(empresaFiscalIdStr)
      : null;

    // Query DocumentoFiscal with type in [NFE_SAIDA, NFSE]
    // Includes linked MovimentacaoFiscal to calculate valorTotal dynamically (avoids N+1)
    const docs = await prisma.documentoFiscal.findMany({
      where: {
        tipo: { in: ["NFE_SAIDA", "NFSE"] },
        createdAt: { gte: start, lte: end },
        ...(empresaFiscalId ? { empresaFiscalId } : {}),
      },
      include: {
        empresaFiscal: {
          select: {
            id: true,
            nomeFantasia: true,
            razaoSocial: true,
            cnpj: true,
          },
        },
        cliente: {
          select: {
            razaoSocial: true,
          },
        },
        pedidoVenda: {
          select: {
            numero: true,
          },
        },
        movimentacoesFiscais: {
          select: {
            valorTotal: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const documentos = docs.map((d) => {
      const valorTotal = d.movimentacoesFiscais.reduce((sum, mf) => sum + mf.valorTotal, 0);
      return {
        id: d.id,
        tipo: d.tipo,
        numero: d.numero,
        status: d.status,
        dataEmissao: d.dataEmissao ? d.dataEmissao.toISOString().split("T")[0] : d.createdAt.toISOString().split("T")[0],
        empresa: d.empresaFiscal.nomeFantasia || d.empresaFiscal.razaoSocial,
        cliente: d.cliente?.razaoSocial || "—",
        pedidoNumero: d.pedidoVenda?.numero || "—",
        valorTotal: Number(valorTotal.toFixed(2)),
      };
    });

    // Breakdown por Empresa Fiscal
    const empresaGroups = new Map<number, any>();
    docs.forEach((d) => {
      const emp = d.empresaFiscal;
      const valorTotal = d.movimentacoesFiscais.reduce((sum, mf) => sum + mf.valorTotal, 0);

      if (!empresaGroups.has(emp.id)) {
        empresaGroups.set(emp.id, {
          empresaFiscalId: emp.id,
          nomeFantasia: emp.nomeFantasia || emp.razaoSocial,
          cnpj: emp.cnpj,
          totalDocumentos: 0,
          valorTotal: 0,
        });
      }

      const g = empresaGroups.get(emp.id);
      g.totalDocumentos += 1;
      g.valorTotal += valorTotal;
    });

    const porEmpresa = Array.from(empresaGroups.values()).map((g) => ({
      ...g,
      valorTotal: Number(g.valorTotal.toFixed(2)),
    }));

    // Summary calculations
    const totalDocumentos = docs.length;
    const totalAutorizados = docs.filter((d) => d.status === "AUTORIZADA").length;
    const totalRejeitados = docs.filter((d) => d.status === "REJEITADA").length;
    const totalCancelados = docs.filter((d) => d.status === "CANCELADA").length;
    const valorTotal = documentos.reduce((sum, d) => sum + d.valorTotal, 0);

    return NextResponse.json({
      periodo: {
        inicio: start.toISOString().split("T")[0],
        fim: end.toISOString().split("T")[0],
      },
      resumo: {
        totalDocumentos,
        totalAutorizados,
        totalRejeitados,
        totalCancelados,
        valorTotal: Number(valorTotal.toFixed(2)),
      },
      porEmpresa,
      documentos,
    });
  } catch (error) {
    console.error("GET /api/relatorios/documentos-fiscais", error);
    return NextResponse.json({ error: "Erro ao gerar relatorio de documentos fiscais." }, { status: 500 });
  }
}
