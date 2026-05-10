import { auth } from "@/auth";
import type { PerfilUsuario } from "@prisma/client";

export type AuthActor = {
  usuarioId: number;
  perfil: PerfilUsuario;
};

export async function getAuthActor(): Promise<AuthActor | null> {
  const session = await auth();
  const user = session?.user as any;
  const usuarioId = Number(user?.id);
  const perfil = user?.role as PerfilUsuario | undefined;

  if (!session || !Number.isFinite(usuarioId) || !perfil) {
    return null;
  }

  return { usuarioId, perfil };
}

export async function requireAuthActor(): Promise<AuthActor> {
  const actor = await getAuthActor();
  if (!actor) throw new Error("Autenticacao obrigatoria.");
  return actor;
}

export function assertPerfil(actor: AuthActor, perfis: PerfilUsuario[]) {
  if (actor.perfil === "ADMINISTRADOR") return;
  if (!perfis.includes(actor.perfil)) {
    throw new Error("Usuario sem permissao para acessar este recurso.");
  }
}

export function canAccessPath(pathname: string, perfil?: PerfilUsuario) {
  if (!perfil) return false;
  if (perfil === "ADMINISTRADOR") return true;

  // Rotas exclusivas de ADMINISTRADOR
  if (
    pathname.startsWith("/sistema/usuarios") ||
    pathname.startsWith("/api/usuarios") ||
    pathname.startsWith("/sistema/relatorios") ||
    pathname.startsWith("/api/relatorios") ||
    pathname.startsWith("/sistema/configuracoes")
  ) {
    return false;
  }

  // Financeiro — FINANCEIRO (fornecedores tratado separadamente abaixo)
  if (pathname.startsWith("/sistema/financeiro") || pathname.startsWith("/api/financeiro")) {
    return perfil === "FINANCEIRO";
  }

  // Estoque — ESTOQUE
  if (pathname.startsWith("/sistema/estoque") || pathname.startsWith("/api/estoque")) {
    return perfil === "ESTOQUE";
  }

  // Compras — ESTOQUE
  if (pathname.startsWith("/sistema/compras") || pathname.startsWith("/api/compras")) {
    return perfil === "ESTOQUE";
  }

  // Fornecedores — ESTOQUE e FINANCEIRO
  if (pathname.startsWith("/sistema/fornecedores") || pathname.startsWith("/api/fornecedores")) {
    return perfil === "ESTOQUE" || perfil === "FINANCEIRO";
  }

  // Pedidos (funil) e API do funil — todos os perfis podem visualizar
  if (pathname.startsWith("/sistema/pedidos") || pathname === "/api/vendas/funil") {
    return true;
  }

  // Vendas — VENDAS (funil já tratado acima)
  if (pathname.startsWith("/sistema/vendas") || pathname.startsWith("/api/vendas")) {
    return perfil === "VENDAS";
  }

  // Cadastros compartilhados — Produtos e Categorias são visualização para VENDAS
  if (pathname.startsWith("/sistema/produtos") || pathname.startsWith("/api/produto")) {
    return perfil === "VENDAS" || perfil === "ESTOQUE";
  }

  if (pathname.startsWith("/sistema/categorias") || pathname.startsWith("/api/produto/categoria")) {
    return perfil === "VENDAS" || perfil === "ESTOQUE";
  }

  // Clientes — VENDAS
  if (pathname.startsWith("/sistema/clientes") || pathname.startsWith("/api/clientes")) {
    return perfil === "VENDAS";
  }

  // Vendedores — VENDAS
  if (pathname.startsWith("/sistema/vendedores") || pathname.startsWith("/api/vendedores")) {
    return perfil === "VENDAS";
  }

  // Fiscal — FINANCEIRO
  if (pathname.startsWith("/api/fiscal")) {
    return perfil === "FINANCEIRO";
  }

  // Dashboard — todos os perfis
  if (pathname === "/sistema" || pathname === "/sistema/" || pathname.startsWith("/api/dashboard")) {
    return true;
  }

  // Deny by default
  return false;
}
