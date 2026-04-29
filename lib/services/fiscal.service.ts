import { prisma } from "@/lib/prisma";
import { RegimeTributario, StatusDocumentoFiscal, TipoDocumentoFiscal } from "@prisma/client";

export class FiscalService {
  /**
   * Lista movimentações fiscais
   */
  static async getMovimentacoesFiscais(filtros: {
    empresaFiscalId?: number;
    clienteId?: number;
    dataInicio?: Date;
    dataFim?: Date;
  }) {
    return prisma.movimentacaoFiscal.findMany({
      where: {
        empresaFiscalId: filtros.empresaFiscalId,
        clienteId: filtros.clienteId,
        createdAt: {
          gte: filtros.dataInicio,
          lte: filtros.dataFim,
        }
      },
      include: {
        empresaFiscal: true,
        cliente: true,
        documentoFiscal: true,
        produto: { select: { descricao: true } },
        lote: { select: { numeroLote: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * Empresas Fiscais ativas
   */
  static async getEmpresasFiscais() {
    return prisma.empresaFiscal.findMany({
      where: { ativo: true }
    });
  }

  /**
   * Relatório Fiscal Agrupado
   */
  static async getRelatorioFiscal(filtros: { dataInicio: Date; dataFim: Date }) {
    return prisma.movimentacaoFiscal.findMany({
      where: {
        createdAt: {
          gte: filtros.dataInicio,
          lte: filtros.dataFim
        },
        pedidoVenda: {
          tipoPedido: 'PEDIDO_NORMAL'
        }
      },

      include: {
        empresaFiscal: { select: { razaoSocial: true, cnpj: true } },
        documentoFiscal: { select: { numero: true, tipo: true, dataEmissao: true } },
        cliente: { select: { razaoSocial: true } },
        produto: { select: { descricao: true, codigoInterno: true } }
      }
    });
  }

  /**
   * Criação de documento fiscal (simplificado)
   */
  static async criarDocumentoFiscal(data: {
    tipo: TipoDocumentoFiscal;
    numero: string;
    empresaFiscalId: number;
    clienteId?: number;
    pedidoVendaId?: number;
    status: StatusDocumentoFiscal;
  }) {
    return prisma.documentoFiscal.create({
      data: {
        tipo: data.tipo,
        numero: data.numero,
        empresaFiscalId: data.empresaFiscalId,
        clienteId: data.clienteId,
        pedidoVendaId: data.pedidoVendaId,
        status: data.status,
        dataEmissao: new Date()
      }
    });
  }
}
