import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthActor, assertPerfil } from "@/lib/authz";
import { EmailProvider } from "@/lib/services/email/email-provider.service";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const actor = await getAuthActor();
  if (!actor) {
    return NextResponse.json({ error: "Nao autorizado." }, { status: 401 });
  }

  try {
    assertPerfil(actor, ["ADMINISTRADOR"]);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 403 });
  }

  const { id } = await params;
  const companyId = Number(id);

  if (isNaN(companyId)) {
    return NextResponse.json({ error: "ID invalido." }, { status: 400 });
  }

  try {
    const body = await req.json();
    const { emailApiKey, emailRemetente, emailAtivo } = body;

    // Valida se a empresa existe
    const empresa = await prisma.empresaFiscal.findUnique({
      where: { id: companyId },
    });
    if (!empresa) {
      return NextResponse.json({ error: "Empresa nao encontrada." }, { status: 404 });
    }

    const data: any = {
      emailAtivo: emailAtivo !== undefined ? !!emailAtivo : empresa.emailAtivo,
    };

    if (emailRemetente !== undefined) {
      data.emailRemetente = emailRemetente?.trim() || null;
    }

    // Se a key foi enviada e não é o placeholder de configurado, criptografa e atualiza
    if (emailApiKey !== undefined && emailApiKey !== null && emailApiKey.trim() !== "" && !emailApiKey.includes("●")) {
      data.emailApiKey = EmailProvider.criptografarApiKey(emailApiKey.trim());
    }

    await prisma.empresaFiscal.update({
      where: { id: companyId },
      data,
    });

    return NextResponse.json({
      success: true,
      message: "Configuracoes de e-mail salvas com sucesso.",
    });
  } catch (error: any) {
    console.error("POST /api/fiscal/empresa/[id]/email:", error);
    return NextResponse.json({ error: "Erro ao salvar configuracoes de e-mail: " + error.message }, { status: 500 });
  }
}
