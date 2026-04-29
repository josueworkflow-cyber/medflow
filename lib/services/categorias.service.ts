import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export type CategoriaListItem = Prisma.CategoriaGetPayload<{}>;

const EMPRESA_ID_FIXA = 1;

export async function getCategorias(): Promise<CategoriaListItem[]> {
  return await prisma.categoria.findMany({
    where: {
      empresaId: EMPRESA_ID_FIXA,
      ativo: true,
    },
    orderBy: {
      nome: "asc",
    },
  });
}

export async function getCategoriaById(id: number): Promise<CategoriaListItem | null> {
  return await prisma.categoria.findUnique({
    where: { id },
  });
}

export async function criarCategoria(nome: string): Promise<CategoriaListItem> {
  return await prisma.categoria.create({
    data: {
      nome: nome.trim(),
      empresaId: EMPRESA_ID_FIXA,
      ativo: true,
    },
  });
}

export async function atualizarCategoria(
  id: number,
  data: { nome?: string; ativo?: boolean }
): Promise<CategoriaListItem> {
  return await prisma.categoria.update({
    where: { id },
    data,
  });
}

export async function deletarCategoria(id: number): Promise<CategoriaListItem> {
  // Soft delete para manter histórico
  return await prisma.categoria.update({
    where: { id },
    data: { ativo: false },
  });
}
