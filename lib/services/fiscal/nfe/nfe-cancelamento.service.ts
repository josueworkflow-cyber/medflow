import { prisma } from "@/lib/prisma";
import { StatusDocumentoFiscal, StatusPedido, TipoDocumentoFiscal, StatusSeparacao } from "@prisma/client";
import { assinarEventoXML } from "./nfe-signer.service";
import { create } from "xmlbuilder2";

export const deps = {
  assinarEventoXML,
  fetch: (url: string | URL, init?: RequestInit) => globalThis.fetch(url, init)
};

/**
 * Helper recursivo para buscar uma chave em um objeto parsed do xmlbuilder2.
 */
function findInObj(obj: any, key: string): any {
  if (!obj || typeof obj !== "object") return null;

  if (obj[key] !== undefined) {
    const val = obj[key];
    if (typeof val === "object" && val !== null && val["#"] !== undefined) {
      return val["#"];
    }
    return val;
  }

  for (const k of Object.keys(obj)) {
    if (typeof obj[k] === "object") {
      const res = findInObj(obj[k], key);
      if (res !== null) return res;
    }
  }
  return null;
}

/**
 * Formata a data e hora do evento no padrão SEFAZ: YYYY-MM-DDTHH:mm:ss-03:00
 */
function getDhEvento(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}-03:00`;
}

/**
 * Serviço responsável por realizar o cancelamento de uma NF-e.
 */
export async function cancelarNFe(
  documentoFiscalId: number,
  motivo: string,
  usuarioId: number
): Promise<void> {
  // 1. Busca o DocumentoFiscal com relacionamentos necessários
  const doc = await prisma.documentoFiscal.findUnique({
    where: { id: documentoFiscalId },
    include: {
      empresaFiscal: true,
      pedidoVenda: {
        include: {
          itens: true,
        },
      },
    },
  });

  // 2. Validações Síncronas
  if (!doc) {
    throw new Error("Documento fiscal não encontrado");
  }

  if (doc.status !== StatusDocumentoFiscal.AUTORIZADA) {
    throw new Error("Apenas NF-e autorizadas podem ser canceladas");
  }

  if (doc.tipo !== TipoDocumentoFiscal.NFE_SAIDA) {
    throw new Error("Operação inválida para este tipo de documento");
  }

  if (!doc.dataAutorizacao) {
    throw new Error("Data de autorização não registrada no documento fiscal.");
  }

  const limitePrazo = 24 * 60 * 60 * 1000; // 24 horas
  const tempoDecorrido = Date.now() - doc.dataAutorizacao.getTime();
  if (tempoDecorrido > limitePrazo) {
    throw new Error("Prazo de cancelamento expirado. Utilize carta de correção ou devolução.");
  }

  if (!motivo || motivo.length < 15 || motivo.length > 255) {
    throw new Error("Motivo deve ter no mínimo 15 caracteres");
  }

  const currentStatus = doc.pedidoVenda?.status;
  if (currentStatus === StatusPedido.DESPACHADO || currentStatus === StatusPedido.FINALIZADO) {
    throw new Error("Pedido já despachado. Cancelamento não permitido.");
  }

  const chNFe = doc.chaveAcesso;
  if (!chNFe) {
    throw new Error("Chave de acesso não encontrada no documento fiscal.");
  }

  const nProt = doc.protocolo;
  if (!nProt) {
    throw new Error("Protocolo de autorização não encontrado no documento fiscal.");
  }

  // 3. Obter nome do usuário executor para o histórico
  const usuario = await prisma.usuario.findUnique({
    where: { id: usuarioId },
    select: { nome: true },
  });
  const nomeUsuario = usuario?.nome || "Usuário";

  const cnpjEmitente = doc.empresaFiscal!.cnpj;
  const ambiente = (doc.empresaFiscal!.ambienteSEFAZ || "homologacao").toLowerCase();
  const tpAmb = ambiente === "producao" ? "1" : "2";
  const nSeqEvento = doc.nSeqEventoCancelamento;
  const idLote = String(Date.now()).slice(-8);

  // 4. Montar o XML do evento de cancelamento
  const eventId = `ID110111${chNFe}${String(nSeqEvento).padStart(2, "0")}`;
  const xmlEvento = `<evento versao="1.00" xmlns="http://www.portalfiscal.inf.br/nfe">` +
    `<infEvento Id="${eventId}">` +
      `<cOrgao>33</cOrgao>` +
      `<tpAmb>${tpAmb}</tpAmb>` +
      `<CNPJ>${cnpjEmitente}</CNPJ>` +
      `<chNFe>${chNFe}</chNFe>` +
      `<dhEvento>${getDhEvento()}</dhEvento>` +
      `<tpEvento>110111</tpEvento>` +
      `<nSeqEvento>${nSeqEvento}</nSeqEvento>` +
      `<verEvento>1.00</verEvento>` +
      `<detEvento versao="1.00">` +
        `<descEvento>Cancelamento</descEvento>` +
        `<nProt>${nProt}</nProt>` +
        `<xJust>${motivo}</xJust>` +
      `</detEvento>` +
    `</infEvento>` +
  `</evento>`;

  // 5. Assinar o XML do evento
  const signedEventoXml = await deps.assinarEventoXML(xmlEvento, doc.empresaFiscalId!);

  // 6. Envelopar no envEvento
  const finalXml = `<envEvento versao="1.00" xmlns="http://www.portalfiscal.inf.br/nfe"><idLote>${idLote}</idLote>${signedEventoXml}</envEvento>`;

  // 7. SOAP Envelope
  const soapEnvelope = `<?xml version="1.0" encoding="utf-8"?>
<soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">
  <soap12:Body>
    <nfeRecepcaoEvento xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/NfeRecepcaoEvento4">
      <nfeDadosMsg>${finalXml}</nfeDadosMsg>
    </nfeRecepcaoEvento>
  </soap12:Body>
</soap12:Envelope>`;

  // 8. Transmissão SOAP para o SEFAZ-RJ com AbortController (30s)
  const url = ambiente === "producao"
    ? "https://nfe.sefaz.rj.gov.br/WSS/NfeRecepcaoEvento4/NfeRecepcaoEvento4.asmx"
    : "https://nfe-homologacao.sefaz.rj.gov.br/WSS/NfeRecepcaoEvento4/NfeRecepcaoEvento4.asmx";

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  let responseText: string;
  try {
    const response = await deps.fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": 'application/soap+xml; charset=utf-8; action="http://www.portalfiscal.inf.br/nfe/wsdl/NfeRecepcaoEvento4/nfeRecepcaoEvento"',
      },
      body: soapEnvelope,
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    responseText = await response.text();
  } catch (error: any) {
    throw new Error("Serviço SEFAZ indisponível. Tente novamente mais tarde.");
  } finally {
    clearTimeout(timeoutId);
  }

  // 9. Parsear resposta com xmlbuilder2
  let cStatLote: string | null = null;
  let xMotivoLote: string | null = null;
  let cStatEvento: string | null = null;
  let xMotivoEvento: string | null = null;

  try {
    const parsed = create(responseText);
    const obj = parsed.end({ format: "object" }) as any;

    const retEnvEvento = findInObj(obj, "retEnvEvento");
    if (retEnvEvento) {
      cStatLote = String(retEnvEvento.cStat || "");
      xMotivoLote = String(retEnvEvento.xMotivo || "");

      const retEvento = retEnvEvento.retEvento;
      if (retEvento && retEvento.infEvento) {
        cStatEvento = String(retEvento.infEvento.cStat || "");
        xMotivoEvento = String(retEvento.infEvento.xMotivo || "");
      }
    }
  } catch (err: any) {
    throw new Error("Resposta da SEFAZ inválida ou não pôde ser processada.");
  }

  if (cStatLote !== "128") {
    throw new Error(`Rejeição SEFAZ (Lote): ${xMotivoLote || "Erro desconhecido"}`);
  }

  if (cStatEvento !== "135") {
    throw new Error(`Rejeição SEFAZ (Evento): ${xMotivoEvento || "Erro desconhecido"}`);
  }

  // 10. Atualização do Banco de Dados em Transação Atômica
  const statusNovo = currentStatus === StatusPedido.SEPARADO
    ? StatusPedido.AUTORIZADO_PARA_SEPARACAO
    : StatusPedido.AGUARDANDO_FATURAMENTO;

  await prisma.$transaction(async (tx) => {
    // A. Atualiza o Documento Fiscal
    await tx.documentoFiscal.update({
      where: { id: documentoFiscalId },
      data: {
        status: StatusDocumentoFiscal.CANCELADA,
        dataCancelamento: new Date(),
        motivoCancelamento: motivo,
        xmlCancelamento: responseText,
      },
    });

    // B. Atualiza o Pedido
    if (doc.pedidoVendaId) {
      await tx.pedidoVenda.update({
        where: { id: doc.pedidoVendaId },
        data: { status: statusNovo },
      });
    }

    // C. Cancela Contas a Receber
    if (doc.pedidoVendaId) {
      await tx.conta.updateMany({
        where: {
          pedidoVendaId: doc.pedidoVendaId,
          tipo: "RECEBER",
        },
        data: { status: "CANCELADA" },
      });
    }

    // D. Lógica de Estoque
    if (doc.pedidoVendaId && doc.pedidoVenda) {
      if (statusNovo === StatusPedido.AUTORIZADO_PARA_SEPARACAO) {
        // Reverter Saída Física (Pedido estava SEPARADO)
        const separacao = await tx.separacao.findUnique({
          where: { pedidoVendaId: doc.pedidoVendaId },
          include: { itens: true },
        });

        if (separacao) {
          for (const item of separacao.itens) {
            const estoque = await tx.estoqueAtual.findFirst({
              where: {
                produtoId: item.produtoId,
                loteId: item.loteId,
              },
            });

            if (estoque) {
              await tx.estoqueAtual.update({
                where: { id: estoque.id },
                data: {
                  quantidadeDisponivel: { increment: item.quantidade },
                },
              });
            } else {
              await tx.estoqueAtual.create({
                data: {
                  produtoId: item.produtoId,
                  loteId: item.loteId,
                  quantidadeDisponivel: item.quantidade,
                  status: "DISPONIVEL",
                },
              });
            }

            // Criar movimentação de DEVOLUCAO
            await tx.movimentacaoEstoque.create({
              data: {
                produtoId: item.produtoId,
                loteId: item.loteId,
                tipo: "DEVOLUCAO",
                quantidade: item.quantidade,
                pedidoVendaId: doc.pedidoVendaId,
                usuarioId: usuarioId,
                observacao: "Estorno de estoque por cancelamento de NF-e",
              },
            });
          }

          // Atualiza status da Separacao para CANCELADA
          await tx.separacao.update({
            where: { id: separacao.id },
            data: { status: StatusSeparacao.CANCELADA },
          });

          // Registra no Historico do Pedido sobre a reversão da separação
          await tx.historicoPedido.create({
            data: {
              pedidoVendaId: doc.pedidoVendaId,
              statusAnterior: currentStatus,
              statusNovo: statusNovo,
              usuarioId: usuarioId,
              observacao: "Separação revertida por cancelamento de NF-e",
            },
          });
        }
      } else {
        // Reverter Reserva (Pedido estava FATURADO, AUTORIZADO_PARA_SEPARACAO ou EM_SEPARACAO)
        const separacao = await tx.separacao.findUnique({
          where: { pedidoVendaId: doc.pedidoVendaId },
          include: { itens: true },
        });

        for (const item of doc.pedidoVenda.itens) {
          let loteId: number | null = null;
          
          if (separacao) {
            const itemSep = separacao.itens.find((i) => i.produtoId === item.produtoId);
            if (itemSep && itemSep.loteId) {
              loteId = itemSep.loteId;
            }
          }

          if (!loteId) {
            const ultimaReserva = await tx.movimentacaoEstoque.findFirst({
              where: {
                pedidoVendaId: doc.pedidoVendaId,
                produtoId: item.produtoId,
                tipo: "RESERVA",
              },
              orderBy: { createdAt: "desc" },
            });
            if (ultimaReserva) {
              loteId = ultimaReserva.loteId;
            }
          }

          const estoque = await tx.estoqueAtual.findFirst({
            where: {
              produtoId: item.produtoId,
              loteId: loteId,
            },
          });

          if (estoque) {
            await tx.estoqueAtual.update({
              where: { id: estoque.id },
              data: {
                quantidadeDisponivel: { increment: item.quantidade },
                quantidadeReservada: { decrement: item.quantidade },
              },
            });
          }

          // Criar movimentação de CANCELAMENTO_RESERVA
          await tx.movimentacaoEstoque.create({
            data: {
              produtoId: item.produtoId,
              loteId: loteId,
              tipo: "CANCELAMENTO_RESERVA",
              quantidade: item.quantidade,
              pedidoVendaId: doc.pedidoVendaId,
              usuarioId: usuarioId,
              observacao: "Cancelamento de reserva por cancelamento de NF-e",
            },
          });
        }
      }
    }

    // E. Registro no Historico do Pedido
    if (doc.pedidoVendaId) {
      await tx.historicoPedido.create({
        data: {
          pedidoVendaId: doc.pedidoVendaId,
          statusAnterior: currentStatus,
          statusNovo: statusNovo,
          usuarioId: usuarioId,
          observacao: `NF-e cancelada — ${motivo} — por ${nomeUsuario}`,
        },
      });
    }
  });
}
