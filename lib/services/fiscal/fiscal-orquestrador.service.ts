import { prisma } from "@/lib/prisma";
import { StatusDocumentoFiscal } from "@prisma/client";
import { buildNFeXml } from "./nfe/nfe-builder.service";
import { assinarXML } from "./nfe/nfe-signer.service";
import { enviarNFe } from "./nfe/nfe-sender.service";
import { gerarDanfe } from "./nfe/nfe-danfe.service";
import { enviarNFSe } from "./nfse/nfse-sender.service";

// Objeto de servicos auxiliares exportado para permitir mocks limpos nos testes unitarios
export const fiscalServices = {
  buildNFeXml,
  assinarXML,
  enviarNFe,
  gerarDanfe,
  enviarNFSe,
};

export class FiscalOrquestradorService {
  /**
   * Orquestra a emissão fiscal de um documento e atualiza o seu status no banco de dados.
   * 
   * @param documentoFiscalId ID do DocumentoFiscal a ser emitido
   */
  static async emitir(documentoFiscalId: number): Promise<{ autorizada: boolean }> {
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

    const pedidoVendaId = doc.pedidoVendaId;
    if (!pedidoVendaId) {
      throw new Error(`Documento fiscal ID ${documentoFiscalId} nao possui pedidoVendaId.`);
    }

    try {
      if (doc.tipo === "NFE_SAIDA") {
        // Fluxo NF-e
        const rawXml = await fiscalServices.buildNFeXml(pedidoVendaId);
        const signedXml = await fiscalServices.assinarXML(rawXml, doc.empresaFiscalId);
        const retorno = await fiscalServices.enviarNFe(signedXml, doc.empresaFiscalId);

        if (retorno.autorizada) {
          const danfePdf = await fiscalServices.gerarDanfe(retorno.xmlAutorizado!);

          await prisma.documentoFiscal.update({
            where: { id: documentoFiscalId },
            data: {
              status: StatusDocumentoFiscal.AUTORIZADA,
              xmlAutorizadoBase64: Buffer.from(retorno.xmlAutorizado!).toString("base64"),
              danfePdfBase64: danfePdf,
              chaveAcesso: retorno.chaveAcesso,
              protocolo: retorno.protocolo,
              dataAutorizacao: new Date(),
              codigoRejeicao: null,
              mensagemRejeicao: null,
              motivoRejeicao: null,
            },
          });

          return { autorizada: true };
        } else {
          const mensagem = retorno.mensagemRejeicao || "Rejeicao sem mensagem especificada.";
          await prisma.documentoFiscal.update({
            where: { id: documentoFiscalId },
            data: {
              status: StatusDocumentoFiscal.REJEITADA,
              codigoRejeicao: retorno.codigoRejeicao,
              mensagemRejeicao: mensagem,
              motivoRejeicao: mensagem,
            },
          });

          return { autorizada: false };
        }
      } else {
        // Fluxo NFS-e
        const retorno = await fiscalServices.enviarNFSe(doc.empresaFiscalId, pedidoVendaId);

        if (retorno.autorizada) {
          const xmlBase64 = retorno.xmlAutorizado
            ? Buffer.from(retorno.xmlAutorizado).toString("base64")
            : null;

          await prisma.documentoFiscal.update({
            where: { id: documentoFiscalId },
            data: {
              status: StatusDocumentoFiscal.AUTORIZADA,
              chaveAcesso: retorno.chaveAcesso,
              xmlAutorizadoBase64: xmlBase64,
              dataAutorizacao: new Date(),
              codigoRejeicao: null,
              mensagemRejeicao: null,
              motivoRejeicao: null,
            },
          });

          return { autorizada: true };
        } else {
          const mensagem = retorno.mensagemRejeicao || "Rejeicao sem mensagem especificada.";
          await prisma.documentoFiscal.update({
            where: { id: documentoFiscalId },
            data: {
              status: StatusDocumentoFiscal.REJEITADA,
              codigoRejeicao: retorno.codigoRejeicao,
              mensagemRejeicao: mensagem,
              motivoRejeicao: mensagem,
            },
          });

          return { autorizada: false };
        }
      }
    } catch (error: any) {
      const errMsg = error.message || String(error);
      // Em erro inesperado: atualiza status para REJEITADA com a mensagem, relança
      await prisma.documentoFiscal.update({
        where: { id: documentoFiscalId },
        data: {
          status: StatusDocumentoFiscal.REJEITADA,
          motivoRejeicao: errMsg,
        },
      });
      throw error;
    }
  }
}
