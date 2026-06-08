import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export type ProdutoComCategoria = Prisma.ProdutoGetPayload<{
  include: { categoriaRef: true };
}>;

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export type ProdutoListItem = Prisma.ProdutoGetPayload<{}>;

export interface GetProdutosParams {
  ativo?: boolean;
  page?: number;
  pageSize?: number;
  search?: string;
  categoria?: string;
}

export async function getProdutos(filtros: GetProdutosParams = {}) {
  const page = filtros.page ?? 0;
  const pageSize = filtros.pageSize ?? 50;
  
  const where: Prisma.ProdutoWhereInput = {
    ativo: filtros.ativo ?? true,
    ...(filtros.categoria && { categoria: filtros.categoria }),
    ...(filtros.search && {
      descricao: { contains: filtros.search, mode: "insensitive" },
    }),
  };

  const [items, total] = await Promise.all([
    prisma.produto.findMany({
      where,
      take: pageSize,
      skip: page * pageSize,
      orderBy: { descricao: "asc" },
    }),
    prisma.produto.count({ where }),
  ]);

  return { items, total, page, pageSize };
}

export async function getProdutoById(id: number): Promise<ProdutoComCategoria | null> {
  return await prisma.produto.findUnique({
    where: { id },
    include: { categoriaRef: true },
  });
}

export async function criarProduto(data: Prisma.ProdutoUncheckedCreateInput): Promise<ProdutoListItem> {
  return await prisma.produto.create({
    data,
  });
}

export async function atualizarProduto(
  id: number,
  data: Prisma.ProdutoUncheckedUpdateInput
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
