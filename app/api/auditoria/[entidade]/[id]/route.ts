import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthActor, assertPerfil } from "@/lib/authz";
import { TipoEntidadeAuditada } from "@prisma/client";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ entidade: string; id: string }> }
) {
  // 1. Obter Ator Autenticado e Validar Permissões
  const actor = await getAuthActor();
  if (!actor) {
    return NextResponse.json({ error: "Nao autorizado." }, { status: 401 });
  }

  try {
    assertPerfil(actor, ["ESTOQUE", "ADMINISTRADOR"]);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 403 });
  }

  try {
    const { entidade, id } = await params;

    // 2. Mapear a entidade dinâmica do path para o enum (case-insensitive)
    const entidadeLower = entidade.toLowerCase();
    let tipoEntidade: TipoEntidadeAuditada;

    if (entidadeLower === "produto") {
      tipoEntidade = TipoEntidadeAuditada.PRODUTO;
    } else if (entidadeLower === "lote") {
      tipoEntidade = TipoEntidadeAuditada.LOTE;
    } else if (entidadeLower === "movimentacao-estoque") {
      tipoEntidade = TipoEntidadeAuditada.MOVIMENTACAO_ESTOQUE;
    } else {
      return NextResponse.json({ error: "Entidade inválida." }, { status: 400 });
    }

    // 3. Validar ID
    const entidadeId = Number(id);
    if (isNaN(entidadeId)) {
      return NextResponse.json({ error: "ID inválido." }, { status: 400 });
    }

    // 4. Buscar histórico de alterações
    const historico = await prisma.historicoAlteracao.findMany({
      where: {
        entidade: tipoEntidade,
        entidadeId,
      },
      include: {
        usuario: {
          select: {
            id: true,
            nome: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // 5. Agrupar os registros pelo `grupoId` mantendo a ordenação descrescente
    type GroupedAudit = {
      grupoId: string;
      data: Date;
      usuario: { id: number; nome: string } | null;
      motivo: string;
      alteracoes: { campo: string; valorAnterior: string | null; valorNovo: string | null }[];
    };

    const groupedMap = new Map<string, GroupedAudit>();

    for (const item of historico) {
      if (!groupedMap.has(item.grupoId)) {
        groupedMap.set(item.grupoId, {
          grupoId: item.grupoId,
          data: item.createdAt,
          usuario: item.usuario ? { id: item.usuario.id, nome: item.usuario.nome } : null,
          motivo: item.motivo,
          alteracoes: [],
        });
      }

      const group = groupedMap.get(item.grupoId)!;
      group.alteracoes.push({
        campo: item.campo,
        valorAnterior: item.valorAnterior,
        valorNovo: item.valorNovo,
      });
    }

    const result = Array.from(groupedMap.values());

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("GET /api/auditoria/[entidade]/[id]:", error);
    return NextResponse.json(
      { error: "Erro ao buscar histórico de alterações." },
      { status: 500 }
    );
  }
}
