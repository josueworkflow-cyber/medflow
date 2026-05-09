import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export type ProdutoComCategoria = Prisma.ProdutoGetPayload<{
  include: { categoriaRef: true };
}>;

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export type ProdutoListItem = Prisma.ProdutoGetPayload<{}>;

export interface ProdutoFiltros {
  categoria?: string;
  ativo?: boolean;
}

export async function getProdutos(filtros?: ProdutoFiltros): Promise<ProdutoListItem[]> {
  const where: Prisma.ProdutoWhereInput = {};
  
  if (filtros?.categoria) {
    where.categoria = filtros.categoria;
  }
  
  where.ativo = filtros?.ativo ?? true;

  return await prisma.produto.findMany({
    where,
    orderBy: { id: "desc" },
  });
}

export async function getProdutoById(id: number): Promise<ProdutoComCategoria | null> {
  return await prisma.produto.findUnique({
    where: { id },
    include: { categoriaRef: true },
  });
}

export async function criarProduto(data: Prisma.ProdutoCreateInput): Promise<ProdutoListItem> {
  return await prisma.produto.create({
    data,
  });
}

export async function atualizarProduto(
  id: number,
  data: Prisma.ProdutoUpdateInput
): Promise<ProdutoListItem> {
  return await prisma.produto.update({
    where: { id },
    data,
  });
}

export async function inativarProduto(id: number): Promise<void> {
  await prisma.produto.update({
    where: { id },
    data: { ativo: false },
  });
}
