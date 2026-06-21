import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { SignJWT } from "jose";

export async function POST(req: NextRequest) {
  let body;
  try {
    body = await req.json();
  } catch (err) {
    return NextResponse.json(
      { error: "Body inválido." },
      { status: 400 }
    );
  }

  try {
    const { email, password } = body;

    // 1. Validar presença dos campos email e password
    if (!email || !password) {
      return NextResponse.json(
        { error: "E-mail e senha são obrigatórios." },
        { status: 400 }
      );
    }

    // 2. Buscar o usuário pelo e-mail
    const user = await prisma.usuario.findUnique({
      where: { email: email.trim().toLowerCase() },
    });

    // 3. Validar se o usuário existe e está ativo
    if (!user || !user.ativo) {
      return NextResponse.json(
        { error: "Credenciais inválidas ou usuário inativo." },
        { status: 401 }
      );
    }

    // 4. Validar a senha com bcrypt
    const isPasswordValid = await bcrypt.compare(password, user.senha);
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: "Credenciais inválidas." },
        { status: 401 }
      );
    }

    // 5. Restringir acesso apenas aos perfis ESTOQUE e ADMINISTRADOR
    if (user.perfil !== "ESTOQUE" && user.perfil !== "ADMINISTRADOR") {
      return NextResponse.json(
        { error: "Acesso negado para este perfil de usuário." },
        { status: 403 }
      );
    }

    // 6. Gerar o token JWT utilizando jose
    const secretStr = process.env.AUTH_SECRET;
    if (!secretStr) {
      console.error("AUTH_SECRET não está definida no ambiente.");
      return NextResponse.json(
        { error: "Erro interno de configuração do servidor." },
        { status: 500 }
      );
    }

    const secret = new TextEncoder().encode(secretStr);
    const token = await new SignJWT({
      id: user.id,
      nome: user.nome,
      perfil: user.perfil,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("8h")
      .sign(secret);

    // 7. Retornar o token e dados básicos do usuário
    return NextResponse.json(
      {
        token,
        usuario: {
          id: user.id,
          nome: user.nome,
          perfil: user.perfil,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Erro no endpoint POST /api/mobile/auth/login:", error);
    return NextResponse.json(
      { error: "Erro interno no servidor ao processar autenticação." },
      { status: 500 }
    );
  }
}
