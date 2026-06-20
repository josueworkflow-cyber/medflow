import { prisma } from "@/lib/prisma";
import * as emailProvider from "../../email/email-provider.service";
import { StatusDocumentoFiscal } from "@prisma/client";

/**
 * Envia o XML da nota fiscal por e-mail para o cliente.
 * 
 * Regra arquitetural: O PDF do DANFe não é anexado diretamente para evitar limites de cota e spam.
 * Em vez disso, é fornecido um link seguro no corpo do e-mail que aponta para o endpoint de download.
 */
export async function enviarEmailFiscal(documentoFiscalId: number): Promise<void> {
  const doc = await prisma.documentoFiscal.findUnique({
    where: { id: documentoFiscalId },
    include: {
      empresaFiscal: true,
      pedidoVenda: {
        include: {
          cliente: true,
        },
      },
    },
  });

  if (!doc) {
    throw new Error(`Documento fiscal ID ${documentoFiscalId} nao encontrado.`);
  }

  if (doc.status !== StatusDocumentoFiscal.AUTORIZADA) {
    throw new Error(`Documento fiscal ID ${documentoFiscalId} nao esta com status AUTORIZADA.`);
  }

  if (!doc.xmlAutorizadoBase64) {
    throw new Error(`Documento fiscal ID ${documentoFiscalId} nao possui XML autorizado.`);
  }

  const cliente = doc.pedidoVenda?.cliente;
  if (!cliente) {
    throw new Error(`Cliente nao associado ao pedido de venda do documento fiscal ID ${documentoFiscalId}.`);
  }

  if (!cliente.email) {
    throw new Error(`Cliente ${cliente.razaoSocial} nao possui e-mail cadastrado.`);
  }

  const emailDestinatario = cliente.email;
  const nomeEmpresa = doc.empresaFiscal?.nomeFantasia || doc.empresaFiscal?.razaoSocial || "MedFlow";
  const assunto = `Nota Fiscal Eletronica - Pedido #${doc.pedidoVenda?.numero || doc.pedidoVendaId} - ${nomeEmpresa}`;
  
  // Link para download do DANFe em PDF
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const linkDanfe = `${baseUrl}/api/fiscal/${doc.id}/danfe`;
  
  const html = `
    <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2 style="color: #2b6cb0;">Olá, ${cliente.razaoSocial}!</h2>
        <p>Gostaríamos de informar que a sua Nota Fiscal Eletrônica referente ao pedido <strong>#${doc.pedidoVenda?.numero || doc.pedidoVendaId}</strong> foi emitida com sucesso pela <strong>${doc.empresaFiscal?.razaoSocial || "MedFlow"}</strong>.</p>
        
        <p>Você pode visualizar e fazer o download do seu DANFe em PDF diretamente pelo link abaixo:</p>
        <p style="margin: 20px 0;">
          <a href="${linkDanfe}" style="background-color: #3182ce; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Visualizar DANFe (PDF)</a>
        </p>

        <p>O arquivo XML autorizado com validade jurídica encontra-se anexado a este e-mail.</p>

        <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;" />
        <p style="font-size: 12px; color: #777;">Este é um e-mail automático enviado por MedFlow ERP. Por favor, não responda a este e-mail.</p>
      </body>
    </html>
  `;

  // XML anexado
  const xmlBuffer = Buffer.from(doc.xmlAutorizadoBase64, "base64");
  const anexos = [
    {
      filename: `NFe-${doc.numero || doc.id}.xml`,
      content: xmlBuffer,
    },
  ];

  await emailProvider.EmailProvider.enviarEmail({
    empresaEmissoraId: doc.empresaFiscalId || 0,
    destinatario: emailDestinatario,
    assunto,
    html,
    anexos,
    pedidoVendaId: doc.pedidoVendaId || undefined,
    documentoFiscalId: doc.id,
  });
}
