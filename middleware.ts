import { auth } from "./auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";

export async function middleware(request: NextRequest) {
  const session = await auth();
  const { pathname } = request.nextUrl;

  // Se estiver tentando acessar o sistema sem estar logado
  if (pathname.startsWith("/sistema") && !session) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Se estiver logado e tentar acessar a página de login
  if (pathname.startsWith("/login") && session) {
    return NextResponse.redirect(new URL("/sistema", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/sistema/:path*", "/login"],
};
