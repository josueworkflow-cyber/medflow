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
    // Busca a empresa
    const empresa = await prisma.empresaFiscal.findUnique({
      where: { id: companyId },
      select: {
        emailAtivo: true,
        emailRemetente: true,
        emailApiKey: true,
      },
    });

    if (!empresa) {
      return NextResponse.json({ error: "Empresa nao encontrada." }, { status: 404 });
    }

    // Regra explícita solicitada pelo usuário: se desativado ou não configurado, retorna 400
    if (!empresa.emailAtivo || !empresa.emailRemetente || !empresa.emailApiKey) {
      return NextResponse.json({ error: "Configure e ative o e-mail antes de testar" }, { status: 400 });
    }

    // Busca o e-mail do usuário logado
    const usuario = await prisma.usuario.findUnique({
      where: { id: actor.usuarioId },
    });

    if (!usuario || !usuario.email) {
      return NextResponse.json({ error: "E-mail do usuario logado nao encontrado." }, { status: 404 });
    }

    // Tenta enviar o e-mail de teste
    await EmailProvider.enviarEmail({
      empresaEmissoraId: companyId,
      destinatario: usuario.email,
      assunto: "Teste de Configuracao de E-mail - Medflow ERP",
      html: `
        <div style="font-family: sans-serif; padding: 20px; color: #333;">
          <h2 style="color: #4f46e5;">Teste de Configuracao de E-mail</h2>
          <p>Ola <strong>${usuario.nome}</strong>,</p>
          <p>Este e um e-mail de teste enviado para validar as configuracoes de e-mail da empresa no Medflow ERP.</p>
          <p>A integracao via Resend esta ativa e funcionando corretamente!</p>
          <br/>
          <hr style="border: 0; border-top: 1px solid #eee;" />
          <small style="color: #666;">Enviado em: ${new Date().toLocaleString("pt-BR")}</small>
        </div>
      `,
    });

    return NextResponse.json({
      success: true,
      message: `E-mail de teste enviado com sucesso para ${usuario.email}`,
    });
  } catch (error: any) {
    console.error("POST /api/fiscal/empresa/[id]/email/teste:", error);
    return NextResponse.json({ error: "Erro ao enviar e-mail de teste: " + error.message }, { status: 500 });
  }
}
