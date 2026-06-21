import { auth } from "./auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { canAccessPath } from "@/lib/authz";
import { jwtVerify } from "jose";

export const runtime = "nodejs";

export async function middleware(request: NextRequest) {
  const session = await auth();
  const { pathname } = request.nextUrl;
  const isApi = pathname.startsWith("/api");

  if (
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/mobile/auth") ||
    pathname === "/api/health"
  ) {
    return NextResponse.next();
  }

  // Verificar presença de Bearer Token no header Authorization
  const authHeader = request.headers.get("Authorization");
  const hasBearer = authHeader && authHeader.startsWith("Bearer ");
  
  let perfil = (session?.user as any)?.role;
  let hasValidToken = false;

  if (!session && hasBearer) {
    try {
      const token = authHeader.substring(7).trim();
      const secretStr = process.env.AUTH_SECRET;
      if (secretStr) {
        const secret = new TextEncoder().encode(secretStr);
        const { payload } = await jwtVerify(token, secret);
        perfil = payload.perfil as any;
        hasValidToken = true;
      }
    } catch (err) {
      // Token expirou ou é inválido
    }
  }

  // Se não estiver logado via cookie nem via Bearer Token válido
  if (!session && !hasValidToken) {
    if (isApi) {
      return NextResponse.json({ error: "Nao autorizado." }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Se estiver logado e tentar acessar a página de login
  if (pathname.startsWith("/login") && (session || hasValidToken)) {
    return NextResponse.redirect(new URL("/sistema", request.url));
  }

  // Verificar permissão de acesso baseado no perfil do usuário
  if (perfil) {
    if (!canAccessPath(pathname, perfil)) {
      if (isApi) {
        return NextResponse.json({ error: "Acesso negado para este perfil." }, { status: 403 });
      }
      return NextResponse.redirect(new URL("/sistema", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/sistema/:path*", "/login", "/api/:path*"],
};
