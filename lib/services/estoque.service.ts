import { prisma } from "@/lib/prisma";
import { TipoMovimentacao, StatusEstoque, RegimeTributario, Prisma } from "@prisma/client";

export class EstoqueService {
  /**
   * Busca saldos atuais com filtros
   */
  static async getEstoqueAtual(filtros: { 
    produtoId?: number; 
    loteId?: number; 
    status?: StatusEstoque;
    localizacaoId?: number;
  }) {
    return prisma.estoqueAtual.findMany({
      where: {
        produtoId: filtros.produtoId,
        loteId: filtros.loteId,
        status: filtros.status,
        localizacaoId: filtros.localizacaoId,
      },
      include: {
        produto: true,
        lote: true,
        localizacao: true,
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  /**
   * Resumo para os cards da dashboard de estoque
   */
  static async getEstoqueResumo() {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const em30dias = new Date(hoje.getTime() + 30 * 24 * 60 * 60 * 1000);

    const [saldos, vencendoCount, faturadoMes] = await Promise.all([
      prisma.estoqueAtual.aggregate({
        _sum: {
          quantidadeDisponivel: true,
          quantidadeReservada: true,
        },
      }),
      prisma.estoqueAtual.aggregate({
        where: {
          quantidadeDisponivel: { gt: 0 },
          lote: {
            validade: {
              gte: hoje,
              lte: em30dias
            }
          }
        },
        _count: true,
      }),
      prisma.movimentacaoFiscal.aggregate({
        where: {
          createdAt: {
            gte: new Date(hoje.getFullYear(), hoje.getMonth(), 1)
          }
        },
        _sum: { valorTotal: true }
      })
    ]);

    const semAlocacaoFiscal = await prisma.movimentacaoEstoque.count({
      where: {
        tipo: 'SAIDA',
        movimentacaoFiscal: null
      }
    });

    return {
      fisicoTotal: saldos._sum.quantidadeDisponivel || 0,
      reservados: saldos._sum.quantidadeReservada || 0,
      vencendo: vencendoCount._count || 0,
      semAlocacaoFiscal,
      faturadoNoMes: faturadoMes._sum.valorTotal || 0
    };
  }

  /**
   * Registra entrada de produto (Estoque Operacional)
   */
  static async registrarEntrada(data: {
    produtoId: number;
    quantidade: number;
    numeroLote?: string;
    validade?: Date;
    localizacaoId?: number;
    custoUnitario?: number;
    usuarioId?: number;
    observacao?: string;
    fornecedorId?: number;
    enderecoEstoque?: string;
    status?: 'DISPONIVEL' | 'QUARENTENA' | 'BLOQUEADO' | 'VENCIDO';
  }) {
    return prisma.$transaction(async (tx) => {
      let loteId = null;
      const produto = await tx.produto.findUnique({ where: { id: data.produtoId } });
      if (!produto) throw new Error("Produto nao encontrado");
      if (produto.controlaLote && !data.numeroLote) {
        throw new Error("Lote e obrigatorio para este produto");
      }
      if (produto.controlaValidade && !data.validade) {
        throw new Error("Validade e obrigatoria para este produto");
      }
      
      if (data.numeroLote) {
        const lote = await tx.lote.upsert({
          where: {
            numeroLote_produtoId: {
              numeroLote: data.numeroLote,
              produtoId: data.produtoId
            }
          },
          update: {
            validade: data.validade,
            localizacaoId: data.localizacaoId,
            fornecedorId: data.fornecedorId,
            enderecoEstoque: data.enderecoEstoque,
            status: data.status || 'DISPONIVEL',
            precoCusto: data.custoUnitario
          },
          create: {
            numeroLote: data.numeroLote,
            validade: data.validade,
            produtoId: data.produtoId,
            localizacaoId: data.localizacaoId,
            fornecedorId: data.fornecedorId,
            enderecoEstoque: data.enderecoEstoque,
            status: data.status || 'DISPONIVEL',
            precoCusto: data.custoUnitario
          }
        });
        loteId = lote.id;
      }

      // Criar movimentação
      const mov = await tx.movimentacaoEstoque.create({
        data: {
          produtoId: data.produtoId,
          loteId: loteId,
          tipo: 'ENTRADA',
          quantidade: data.quantidade,
          usuarioId: data.usuarioId,
          localizacaoId: data.localizacaoId,
          observacao: data.observacao || 'Entrada operacional',
          origem: 'Entrada Manual'
        }
      });

      // Atualizar EstoqueAtual
      const estoque = await tx.estoqueAtual.findFirst({
        where: {
          produtoId: data.produtoId,
          loteId: loteId,
          localizacaoId: data.localizacaoId
        }
      });

      if (estoque) {
        await tx.estoqueAtual.update({
          where: { id: estoque.id },
          data: {
            quantidadeDisponivel: { increment: data.quantidade },
            custoUnitario: data.custoUnitario || estoque.custoUnitario
          }
        });
      } else {
        await tx.estoqueAtual.create({
          data: {
            produtoId: data.produtoId,
            loteId: loteId,
            localizacaoId: data.localizacaoId,
            quantidadeDisponivel: data.quantidade,
            custoUnitario: data.custoUnitario || 0,
            status: 'DISPONIVEL'
          }
        });
      }

      return mov;
    });
  }

  /**
   * Reserva estoque para pedido
   */
  static async registrarReserva(data: {
    produtoId: number;
    loteId?: number;
    quantidade: number;
    pedidoVendaId: number;
    usuarioId?: number;
  }) {
    return prisma.$transaction(async (tx) => {
      const estoque = await tx.estoqueAtual.findFirst({
        where: {
          produtoId: data.produtoId,
          loteId: data.loteId
        }
      });

      if (!estoque || estoque.quantidadeDisponivel < data.quantidade) {
        throw new Error('Estoque insuficiente para reserva');
      }

      await tx.estoqueAtual.update({
        where: { id: estoque.id },
        data: {
          quantidadeDisponivel: { decrement: data.quantidade },
          quantidadeReservada: { increment: data.quantidade }
        }
      });

      return tx.movimentacaoEstoque.create({
        data: {
          produtoId: data.produtoId,
          loteId: data.loteId,
          tipo: 'RESERVA',
          quantidade: data.quantidade,
          pedidoVendaId: data.pedidoVendaId,
          usuarioId: data.usuarioId,
          observacao: `Reserva para pedido ${data.pedidoVendaId}`
        }
      });
    });
  }

  /**
   * Cancela reserva
   */
  static async cancelarReserva(data: {
    movimentacaoReservaId: number;
    usuarioId?: number;
  }) {
    return prisma.$transaction(async (tx) => {
      const movReserva = await tx.movimentacaoEstoque.findUnique({
        where: { id: data.movimentacaoReservaId }
      });

      if (!movReserva || movReserva.tipo !== 'RESERVA') {
        throw new Error('Movimentação de reserva não encontrada');
      }

      const estoque = await tx.estoqueAtual.findFirst({
        where: {
          produtoId: movReserva.produtoId,
          loteId: movReserva.loteId
        }
      });

      if (!estoque || estoque.quantidadeReservada < movReserva.quantidade) {
        throw new Error('Erro na integridade da reserva');
      }

      await tx.estoqueAtual.update({
        where: { id: estoque.id },
        data: {
          quantidadeDisponivel: { increment: movReserva.quantidade },
          quantidadeReservada: { decrement: movReserva.quantidade }
        }
      });

      return tx.movimentacaoEstoque.create({
        data: {
          produtoId: movReserva.produtoId,
          loteId: movReserva.loteId,
          tipo: 'CANCELAMENTO_RESERVA',
          quantidade: movReserva.quantidade,
          pedidoVendaId: movReserva.pedidoVendaId,
          usuarioId: data.usuarioId,
          observacao: `Cancelamento da reserva #${data.movimentacaoReservaId}`
        }
      });
    });
  }

  /**
   * Baixa estoque com Faturamento (Estoque Operacional + Fiscal)
   */
  static async registrarSaidaFaturamento(data: {
    pedidoVendaId: number;
    clienteId: number;
    empresaFiscalId: number;
    documentoFiscalId: number;
    itens: {
      produtoId: number;
      loteId?: number;
      quantidade: number;
      valorTotal: number;
    }[];
    usuarioId?: number;
  }) {
    return prisma.$transaction(async (tx) => {
      const resultados = [];

      for (const item of data.itens) {
        // 1. Baixar EstoqueAtual
        const estoque = await tx.estoqueAtual.findFirst({
          where: {
            produtoId: item.produtoId,
            loteId: item.loteId
          }
        });

        // Tenta baixar da reservada se houver, senão da disponível
        // (Isso depende de como o fluxo de separação funciona, 
        // mas seguindo a regra: "Baixar quantidade do EstoqueAtual")
        if (!estoque || (estoque.quantidadeDisponivel + estoque.quantidadeReservada) < item.quantidade) {
          throw new Error(`Estoque insuficiente para o produto ID ${item.produtoId}`);
        }

        const qtdADezetivarRes = Math.min(estoque.quantidadeReservada, item.quantidade);
        const qtdADezetivarDisp = item.quantidade - qtdADezetivarRes;

        await tx.estoqueAtual.update({
          where: { id: estoque.id },
          data: {
            quantidadeDisponivel: { decrement: qtdADezetivarDisp },
            quantidadeReservada: { decrement: qtdADezetivarRes }
          }
        });

        // 2. Criar MovimentacaoEstoque tipo SAIDA
        const movEstoque = await tx.movimentacaoEstoque.create({
          data: {
            produtoId: item.produtoId,
            loteId: item.loteId,
            tipo: 'SAIDA',
            quantidade: item.quantidade,
            pedidoVendaId: data.pedidoVendaId,
            usuarioId: data.usuarioId,
            empresaFiscalId: data.empresaFiscalId,
            destino: `Cliente ID ${data.clienteId}`,
            observacao: `Saída por faturamento pedido ${data.pedidoVendaId}`
          }
        });

        // 3. Criar MovimentacaoFiscal
        const movFiscal = await tx.movimentacaoFiscal.create({
          data: {
            movimentacaoEstoqueId: movEstoque.id,
            pedidoVendaId: data.pedidoVendaId,
            clienteId: data.clienteId,
            empresaFiscalId: data.empresaFiscalId,
            documentoFiscalId: data.documentoFiscalId,
            produtoId: item.produtoId,
            loteId: item.loteId,
            quantidade: item.quantidade,
            valorTotal: item.valorTotal,
            status: 'EMITIDA',
            dataEmissao: new Date()
          }
        });

        resultados.push({ movEstoque, movFiscal });
      }

      return resultados;
    });
  }

  /**
   * Histórico completo de um produto/lote
   */
  static async getHistorico(produtoId: number, loteId?: number) {
    return prisma.movimentacaoEstoque.findMany({
      where: {
        produtoId,
        loteId
      },
      include: {
        usuarioRef: { select: { nome: true } },
        pedidoVenda: {
          include: {
            cliente: { select: { razaoSocial: true } }
          }
        },
        movimentacaoFiscal: {
          include: {
            empresaFiscal: { select: { nomeFantasia: true } },
            documentoFiscal: { select: { numero: true, tipo: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }
}
