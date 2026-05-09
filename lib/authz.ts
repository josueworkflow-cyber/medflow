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

  if (pathname.startsWith("/sistema/usuarios") || pathname.startsWith("/api/usuarios")) {
    return false;
  }

  if (pathname.startsWith("/sistema/financeiro") || pathname.startsWith("/api/financeiro")) {
    return perfil === "FINANCEIRO";
  }

  if (pathname.startsWith("/sistema/estoque") || pathname.startsWith("/api/estoque")) {
    return perfil === "ESTOQUE";
  }

  if (pathname.startsWith("/sistema/compras") || pathname.startsWith("/api/compras")) {
    return perfil === "ESTOQUE";
  }

  if (pathname.startsWith("/sistema/fornecedores") || pathname.startsWith("/api/fornecedores")) {
    return perfil === "ESTOQUE" || perfil === "FINANCEIRO";
  }

  if (pathname.startsWith("/sistema/vendas") && perfil !== "VENDAS") {
    return false;
  }

  return true;
}
