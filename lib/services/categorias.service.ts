import { prisma } from "@/lib/prisma";

const EMPRESA_ID_FIXA = 1;

export type CategoriaWithChildren = {
  id: number;
  nome: string;
  ativo: boolean;
  empresaId: number;
  parentId: number | null;
  children: CategoriaWithChildren[];
};

export async function getCategorias(): Promise<CategoriaWithChildren[]> {
  const categorias = await prisma.categoria.findMany({
    where: {
      empresaId: EMPRESA_ID_FIXA,
      ativo: true,
      parentId: null,
    },
    include: {
      children: {
        where: { ativo: true },
        include: {
          children: {
            where: { ativo: true },
            include: {
              children: {
                where: { ativo: true },
                include: {
                  children: {
                    where: { ativo: true },
                    orderBy: { nome: "asc" }
                  }
                },
                orderBy: { nome: "asc" }
              }
            },
            orderBy: { nome: "asc" }
          }
        },
        orderBy: { nome: "asc" }
      }
    },
    orderBy: {
      nome: "asc",
    },
  });

  return categorias as CategoriaWithChildren[];
}

export async function getAllCategoriasFlat(): Promise<CategoriaWithChildren[]> {
  const categorias = await prisma.categoria.findMany({
    where: {
      empresaId: EMPRESA_ID_FIXA,
      ativo: true,
    },
    orderBy: { nome: "asc" },
  });

  return categorias as CategoriaWithChildren[];
}

export async function getCategoriaById(id: number) {
  return await prisma.categoria.findUnique({
    where: { id },
    include: { children: true },
  });
}

export async function criarCategoria(nome: string, parentId?: number | null) {
  const MAX_NIVEIS = 5;

  if (parentId) {
    const parent = await prisma.categoria.findUnique({ where: { id: parentId } });
    if (!parent) {
      throw new Error("Categoria pai não encontrada.");
    }

    let nivel = 1;
    let current = parent;
    while (current.parentId && nivel < MAX_NIVEIS) {
      const parentCat = await prisma.categoria.findUnique({ where: { id: current.parentId } });
      if (!parentCat) break;
      current = parentCat;
      nivel++;
    }

    if (nivel >= MAX_NIVEIS) {
      throw new Error(`Máximo de ${MAX_NIVEIS} níveis de subcategorias permitidos.`);
    }
  }

  return await prisma.categoria.create({
    data: {
      nome: nome.trim(),
      empresaId: EMPRESA_ID_FIXA,
      ativo: true,
      parentId: parentId || null,
    },
    include: { children: true },
  });
}

export async function atualizarCategoria(
  id: number,
  data: { nome?: string; ativo?: boolean; parentId?: number | null }
) {
  const MAX_NIVEIS = 5;

  if (data.parentId !== undefined && data.parentId !== null) {
    const parent = await prisma.categoria.findUnique({ where: { id: data.parentId } });
    if (!parent) {
      throw new Error("Categoria pai não encontrada.");
    }
    if (data.parentId === id) {
      throw new Error("Uma categoria não pode ser pai de si mesma.");
    }

    let nivel = 1;
    let current = parent;
    while (current.parentId && nivel < MAX_NIVEIS) {
      if (current.parentId === id) {
        throw new Error("Não é possível mover a categoria para uma de suas subcategorias.");
      }
      const parentCat = await prisma.categoria.findUnique({ where: { id: current.parentId } });
      if (!parentCat) break;
      current = parentCat;
      nivel++;
    }

    if (nivel >= MAX_NIVEIS) {
      throw new Error(`Máximo de ${MAX_NIVEIS} níveis de subcategorias permitidos.`);
    }
  }

  return await prisma.categoria.update({
    where: { id },
    data,
    include: { children: true },
  });
}

export async function deletarCategoria(id: number) {
  const children = await prisma.categoria.findMany({
    where: { parentId: id, ativo: true },
  });

  if (children.length > 0) {
    throw new Error("Exclua as subcategorias primeiro.");
  }

  return await prisma.categoria.update({
    where: { id },
    data: { ativo: false },
  });
}