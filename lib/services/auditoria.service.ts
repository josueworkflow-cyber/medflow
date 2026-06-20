import { Prisma, TipoEntidadeAuditada } from "@prisma/client";
import crypto from "crypto";

/**
 * Compara um objeto antigo com um novo conjunto de alterações parciais e retorna
 * apenas os campos que sofreram mudanças reais.
 *
 * - Trata null e undefined como equivalentes
 * - Compara instâncias de Date comparando seus timestamps
 * - Ignora campos que não foram enviados no novo objeto (newObj[campo] === undefined)
 */
export function computeDiff<T extends Record<string, any>>(
  oldObj: T,
  newObj: Partial<T>,
  campos: (keyof T)[]
): { campo: string; valorAnterior: any; valorNovo: any }[] {
  const diffs: { campo: string; valorAnterior: any; valorNovo: any }[] = [];

  for (const campo of campos) {
    const valNew = newObj[campo];
    
    // Ignora campos que não foram enviados na requisição (sendo undefined)
    if (valNew === undefined) {
      continue;
    }

    const valOld = oldObj[campo];

    if (!isEquivalent(valOld, valNew)) {
      diffs.push({
        campo: String(campo),
        valorAnterior: valOld,
        valorNovo: valNew,
      });
    }
  }

  return diffs;
}

/**
 * Auxiliar para verificar se dois valores são equivalentes.
 * Trata null/undefined como iguais e lida com instâncias de Date de forma segura.
 */
function isEquivalent(a: any, b: any): boolean {
  const isNilA = a === null || a === undefined;
  const isNilB = b === null || b === undefined;

  // Se ambos forem nulos/indefinidos, são equivalentes
  if (isNilA && isNilB) {
    return true;
  }

  // Se apenas um for nulo/indefinido, mudou
  if (isNilA !== isNilB) {
    return false;
  }

  // Comparação de datas (se pelo menos um for Date)
  if (a instanceof Date || b instanceof Date) {
    try {
      const timeA = a instanceof Date ? a.getTime() : new Date(a).getTime();
      const timeB = b instanceof Date ? b.getTime() : new Date(b).getTime();
      return timeA === timeB;
    } catch {
      return false;
    }
  }

  // Comparação padrão para tipos primitivos
  return a === b;
}

/**
 * Grava as alterações no banco de dados dentro de uma transação Prisma.
 * Agrupa todas as alterações com um único grupoId (UUID).
 */
export async function registrarAlteracao(
  tx: Prisma.TransactionClient,
  params: {
    entidade: TipoEntidadeAuditada;
    entidadeId: number;
    diffs: { campo: string; valorAnterior: any; valorNovo: any }[];
    motivo: string;
    usuarioId?: number;
  }
): Promise<string | null> {
  const { entidade, entidadeId, diffs, motivo, usuarioId } = params;

  // Se não houver modificações reais, não grava nada no banco
  if (!diffs || diffs.length === 0) {
    return null;
  }

  if (!motivo || !motivo.trim()) {
    throw new Error("O motivo da alteração é obrigatório para registrar a auditoria.");
  }

  const grupoId = crypto.randomUUID();

  // Função auxiliar de serialização segura para string/null
  const serialize = (val: any): string | null => {
    if (val === null || val === undefined) {
      return null;
    }
    if (val instanceof Date) {
      return val.toISOString();
    }
    return String(val);
  };

  const dataToInsert = diffs.map((d) => ({
    grupoId,
    entidade,
    entidadeId,
    campo: d.campo,
    valorAnterior: serialize(d.valorAnterior),
    valorNovo: serialize(d.valorNovo),
    motivo: motivo.trim(),
    usuarioId: usuarioId || null,
  }));

  await tx.historicoAlteracao.createMany({
    data: dataToInsert,
  });

  return grupoId;
}

export const AuditoriaService = {
  computeDiff,
  registrarAlteracao,
};
