import { auth } from "./auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { canAccessPath } from "@/lib/authz";

export const runtime = "nodejs";

export async function middleware(request: NextRequest) {
  const session = await auth();
  const { pathname } = request.nextUrl;
  const isApi = pathname.startsWith("/api");

  if (pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  // Se estiver tentando acessar o sistema sem estar logado
  if ((pathname.startsWith("/sistema") || isApi) && !session) {
    if (isApi) {
      return NextResponse.json({ error: "Nao autorizado." }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Se estiver logado e tentar acessar a página de login
  if (pathname.startsWith("/login") && session) {
    return NextResponse.redirect(new URL("/sistema", request.url));
  }

  if ((pathname.startsWith("/sistema") || isApi) && session) {
    const perfil = (session.user as any)?.role;
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
