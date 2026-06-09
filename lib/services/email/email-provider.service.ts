import { Resend } from "resend";
import { prisma } from "@/lib/prisma";
import { criptografarSenha, descriptografarSenha } from "../fiscal/certificado.service";
import { StatusEmail } from "@prisma/client";

export interface EnviarEmailParams {
  empresaEmissoraId: number;
  destinatario: string;
  assunto: string;
  html: string;
  anexos?: { filename: string; content: Buffer }[];
  pedidoVendaId?: number;
  documentoFiscalId?: number;
}

export function criptografarApiKey(key: string): string {
  return criptografarSenha(key);
}

export function descriptografarApiKey(keyCriptografada: string): string {
  return descriptografarSenha(keyCriptografada);
}

export async function enviarEmail(params: EnviarEmailParams): Promise<void> {
  const { empresaEmissoraId, destinatario, assunto, html, anexos, pedidoVendaId, documentoFiscalId } = params;

  // 1. Busca isolada dos dados de email para não expor a chave em selects gerais
  const empresa = await prisma.empresaFiscal.findUnique({
    where: { id: empresaEmissoraId },
    select: {
      emailApiKey: true,
      emailRemetente: true,
      emailAtivo: true,
    },
  });

  if (!empresa) {
    throw new Error(`Empresa emissora ID ${empresaEmissoraId} nao encontrada.`);
  }

  if (!empresa.emailAtivo) {
    throw new Error(`Servico de e-mail desativado para a empresa ID ${empresaEmissoraId}.`);
  }

  if (!empresa.emailApiKey || !empresa.emailRemetente) {
    throw new Error(`Configuracao de e-mail incompleta para a empresa ID ${empresaEmissoraId}.`);
  }

  // 2. Descriptografa a API Key
  let apiKey: string;
  try {
    apiKey = descriptografarApiKey(empresa.emailApiKey);
  } catch (err: any) {
    throw new Error(`Erro ao descriptografar a chave de API de e-mail da empresa ID ${empresaEmissoraId}.`);
  }

  // 3. Cria registro de LogEmail como PENDENTE
  const logEmail = await prisma.logEmail.create({
    data: {
      destinatario,
      remetente: empresa.emailRemetente,
      assunto,
      status: StatusEmail.PENDENTE,
      pedidoVendaId,
      documentoFiscalId,
      empresaFiscalId: empresaEmissoraId,
    },
  });

  try {
    // 4. Instancia o cliente Resend e envia
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from: empresa.emailRemetente,
      to: [destinatario],
      subject: assunto,
      html,
      attachments: anexos,
    });

    if (error) {
      throw new Error(error.message || `Erro do provedor Resend: ${error.name}`);
    }

    // 5. Atualiza o LogEmail para ENVIADO
    await prisma.logEmail.update({
      where: { id: logEmail.id },
      data: { status: StatusEmail.ENVIADO },
    });
  } catch (err: any) {
    // 6. Atualiza o LogEmail para FALHOU e propaga o erro
    const erroMensagem = err.message || String(err);
    await prisma.logEmail.update({
      where: { id: logEmail.id },
      data: {
        status: StatusEmail.FALHOU,
        erroMensagem,
      },
    });
    // NUNCA logar a API key, apenas relançar o erro
    console.error(`Erro ao enviar e-mail para ${destinatario} via empresa ID ${empresaEmissoraId}: ${erroMensagem}`);
    throw err;
  }
}

export const EmailProvider = {
  enviarEmail,
  criptografarApiKey,
  descriptografarApiKey,
};
