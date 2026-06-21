import { auth } from "@/auth";
import type { PerfilUsuario } from "@prisma/client";
import { jwtVerify } from "jose";
import { NextRequest } from "next/server";
import { headers } from "next/headers";

export type AuthActor = {
  usuarioId: number;
  perfil: PerfilUsuario;
};

export async function getAuthActor(request?: Request | NextRequest): Promise<AuthActor | null> {
  // 1. Tentar fluxo atual via cookie de sessão do NextAuth
  const session = await auth();
  const user = session?.user as any;
  const usuarioId = Number(user?.id);
  const perfil = user?.role as PerfilUsuario | undefined;

  if (session && Number.isFinite(usuarioId) && perfil) {
    return { usuarioId, perfil };
  }

  // 2. Se não houver sessão de cookie, verificar o Header Authorization (Bearer)
  try {
    let authHeader: string | null = null;

    if (request) {
      authHeader = request.headers.get("Authorization");
    } else {
      // Fallback para leitura dinâmica de headers se estiver rodando no Next.js Server Context
      const dynamicHeaders = await headers();
      authHeader = dynamicHeaders.get("Authorization");
    }

    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7).trim();
      const secretStr = process.env.AUTH_SECRET;
      if (!secretStr) {
        console.error("AUTH_SECRET não está definida no ambiente para validação de Bearer Token.");
        return null;
      }

      const secret = new TextEncoder().encode(secretStr);
      const { payload } = await jwtVerify(token, secret);

      const id = Number(payload.id);
      const perfil = payload.perfil as PerfilUsuario;

      if (Number.isFinite(id) && perfil) {
        return { usuarioId: id, perfil };
      }
    }
  } catch (err) {
    console.warn("Validação do Bearer Token falhou:", err);
  }

  return null;
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
    pathname.startsWith("/sistema/configuracoes")
  ) {
    return false;
  }

  // Relatórios — FINANCEIRO e ADMINISTRADOR
  if (pathname.startsWith("/sistema/relatorios") || pathname.startsWith("/api/relatorios")) {
    const p: string = perfil;
    return p === "FINANCEIRO" || p === "ADMINISTRADOR";
  }

  // Financeiro — FINANCEIRO (fornecedores tratado separadamente abaixo)
  if (pathname.startsWith("/sistema/financeiro") || pathname.startsWith("/api/financeiro")) {
    return perfil === "FINANCEIRO";
  }

  // Estoque — ESTOQUE
  if (pathname.startsWith("/sistema/estoque") || pathname.startsWith("/api/estoque")) {
    if (pathname.startsWith("/sistema/estoque/lotes") || pathname.includes("/distribuicao")) {
      return perfil === "ESTOQUE" || perfil === "FINANCEIRO";
    }
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
