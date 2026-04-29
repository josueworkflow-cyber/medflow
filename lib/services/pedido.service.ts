import { prisma } from "@/lib/prisma";
import { 
  StatusPedido, 
  TipoPedido, 
  Prisma, 
  TipoMovimentacao,
  StatusDocumentoFiscal,
  TipoDocumentoFiscal
} from "@prisma/client";
import { EstoqueService } from "./estoque.service";
import { FiscalService } from "./fiscal.service";

export class PedidoService {
  // ── Mapa de transições válidas por tipo de pedido ──
  private static transicoes: Record<TipoPedido, Record<StatusPedido, StatusPedido[]>> = {
    PEDIDO_NORMAL: {
      PEDIDO_CRIADO: [StatusPedido.RESERVADO, StatusPedido.CANCELADO],
      RESERVADO: [StatusPedido.AGUARDANDO_APROVACAO_FINANCEIRA, StatusPedido.CANCELADO],
      AGUARDANDO_APROVACAO_FINANCEIRA: [StatusPedido.APROVADO_FINANCEIRO, StatusPedido.REPROVADO_FINANCEIRO, StatusPedido.CANCELADO],
      APROVADO_FINANCEIRO: [StatusPedido.EM_SEPARACAO, StatusPedido.CANCELADO],
      REPROVADO_FINANCEIRO: [StatusPedido.AGUARDANDO_APROVACAO_FINANCEIRA, StatusPedido.CANCELADO],
      EM_SEPARACAO: [StatusPedido.SEPARADO, StatusPedido.CANCELADO],
      SEPARADO: [StatusPedido.FATURADO, StatusPedido.CANCELADO],
      FATURADO: [StatusPedido.EM_TRANSITO], // Cancelamento pós-faturamento geralmente requer estorno fiscal
      EM_TRANSITO: [StatusPedido.ENTREGUE],
      ENTREGUE: [StatusPedido.FINALIZADO],
      FINALIZADO: [],
      CANCELADO: [],
    },
    PEDIDO_INTERNO: {
      PEDIDO_CRIADO: [StatusPedido.RESERVADO, StatusPedido.CANCELADO],
      RESERVADO: [StatusPedido.AGUARDANDO_APROVACAO_FINANCEIRA, StatusPedido.CANCELADO],
      AGUARDANDO_APROVACAO_FINANCEIRA: [StatusPedido.APROVADO_FINANCEIRO, StatusPedido.REPROVADO_FINANCEIRO, StatusPedido.CANCELADO],
      APROVADO_FINANCEIRO: [StatusPedido.EM_SEPARACAO, StatusPedido.CANCELADO],
      REPROVADO_FINANCEIRO: [StatusPedido.AGUARDANDO_APROVACAO_FINANCEIRA, StatusPedido.CANCELADO],
      EM_SEPARACAO: [StatusPedido.SEPARADO, StatusPedido.CANCELADO],
      SEPARADO: [StatusPedido.EM_TRANSITO, StatusPedido.CANCELADO], // Pula FATURADO
      EM_TRANSITO: [StatusPedido.ENTREGUE],
      ENTREGUE: [StatusPedido.FINALIZADO],
      FINALIZADO: [],
      CANCELADO: [],
    }
  };

  /**
   * Valida se uma transição é permitida
   */
  static validarTransicao(tipo: TipoPedido, atual: StatusPedido, novo: StatusPedido): boolean {
    if (atual === novo) return true;
    const permitidas = this.transicoes[tipo][atual] || [];
    return permitidas.includes(novo);
  }

  /**
   * Registra mudança no histórico dentro de uma transação
   */
  private static async registrarHistorico(
    tx: Prisma.TransactionClient,
    pedidoId: number,
    anterior: StatusPedido | null,
    novo: StatusPedido,
    usuarioId?: number,
    observacao?: string
  ) {
    return tx.historicoPedido.create({
      data: {
        pedidoVendaId: pedidoId,
        statusAnterior: anterior,
        statusNovo: novo,
        usuarioId: usuarioId,
        observacao: observacao,
      },
    });
  }

  /**
   * Criação de pedido
   */
  static async criarPedido(data: {
    clienteId: number;
    vendedorId?: number;
    tipoPedido: TipoPedido;
    empresaFiscalId?: number;
    desconto?: number;
    observacao?: string;
    itens: { produtoId: number; quantidade: number; precoUnitario: number; desconto?: number }[];
  }, usuarioId?: number) {
    if (data.tipoPedido === 'PEDIDO_NORMAL' && !data.empresaFiscalId) {
      throw new Error("Empresa Fiscal é obrigatória para Pedido Normal.");
    }

    const valorTotal = data.itens.reduce(
      (sum, item) => sum + (item.quantidade * item.precoUnitario) - (item.desconto || 0),
      0
    );

    return prisma.$transaction(async (tx) => {
      const pedido = await tx.pedidoVenda.create({
        data: {
          clienteId: data.clienteId,
          vendedorId: data.vendedorId,
          tipoPedido: data.tipoPedido,
          empresaFiscalId: data.empresaFiscalId,
          status: StatusPedido.PEDIDO_CRIADO,
          desconto: data.desconto || 0,
          observacao: data.observacao,
          valorTotal: valorTotal - (data.desconto || 0),
          itens: {
            create: data.itens.map(item => ({
              produtoId: item.produtoId,
              quantidade: item.quantidade,
              precoUnitario: item.precoUnitario,
              desconto: item.desconto || 0,
              subtotal: (item.quantidade * item.precoUnitario) - (item.desconto || 0),
            })),
          },
        },
      });

      await this.registrarHistorico(tx, pedido.id, null, StatusPedido.PEDIDO_CRIADO, usuarioId, "Pedido criado");
      return pedido;
    });
  }

  /**
   * Reserva de Estoque
   */
  static async reservarPedido(id: number, usuarioId?: number) {
    const pedido = await prisma.pedidoVenda.findUnique({
      where: { id },
      include: { itens: true }
    });

    if (!pedido) throw new Error("Pedido não encontrado");
    if (!this.validarTransicao(pedido.tipoPedido, pedido.status, StatusPedido.RESERVADO)) {
      throw new Error(`Transição de ${pedido.status} para RESERVADO não permitida.`);
    }

    return prisma.$transaction(async (tx) => {
      // Para cada item, tentar reservar estoque
      // Nota: O EstoqueService atual espera loteId, mas se não tivermos, vamos pegar o primeiro disponível
      for (const item of pedido.itens) {
        const estoque = await tx.estoqueAtual.findFirst({
          where: { produtoId: item.produtoId, quantidadeDisponivel: { gte: item.quantidade } },
          orderBy: { createdAt: 'asc' } // PEPS simplificado
        });

        if (!estoque) {
          throw new Error(`Estoque insuficiente para o produto ID ${item.produtoId}`);
        }

        await tx.estoqueAtual.update({
          where: { id: estoque.id },
          data: {
            quantidadeDisponivel: { decrement: item.quantidade },
            quantidadeReservada: { increment: item.quantidade }
          }
        });

        await tx.movimentacaoEstoque.create({
          data: {
            produtoId: item.produtoId,
            loteId: estoque.loteId,
            tipo: 'RESERVA',
            quantidade: item.quantidade,
            pedidoVendaId: id,
            usuarioId: usuarioId,
            observacao: `Reserva automática para pedido ${id}`
          }
        });
      }

      const updated = await tx.pedidoVenda.update({
        where: { id },
        data: { status: StatusPedido.RESERVADO }
      });

      await this.registrarHistorico(tx, id, pedido.status, StatusPedido.RESERVADO, usuarioId);
      return updated;
    });
  }

  /**
   * Enviar para Financeiro
   */
  static async enviarParaFinanceiro(id: number, usuarioId?: number) {
    const pedido = await prisma.pedidoVenda.findUnique({ where: { id } });
    if (!pedido) throw new Error("Pedido não encontrado");
    
    const novoStatus = StatusPedido.AGUARDANDO_APROVACAO_FINANCEIRA;
    if (!this.validarTransicao(pedido.tipoPedido, pedido.status, novoStatus)) {
      throw new Error("Ação não permitida no status atual.");
    }

    return prisma.$transaction(async (tx) => {
      const updated = await tx.pedidoVenda.update({
        where: { id },
        data: { status: novoStatus }
      });
      await this.registrarHistorico(tx, id, pedido.status, novoStatus, usuarioId);
      return updated;
    });
  }

  /**
   * Aprovar Financeiro
   */
  static async aprovarFinanceiro(id: number, usuarioId?: number) {
    const pedido = await prisma.pedidoVenda.findUnique({ where: { id } });
    if (!pedido) throw new Error("Pedido não encontrado");

    const novoStatus = StatusPedido.APROVADO_FINANCEIRO;
    if (!this.validarTransicao(pedido.tipoPedido, pedido.status, novoStatus)) {
      throw new Error("Ação não permitida no status atual.");
    }

    return prisma.$transaction(async (tx) => {
      const updated = await tx.pedidoVenda.update({
        where: { id },
        data: { status: novoStatus }
      });
      await this.registrarHistorico(tx, id, pedido.status, novoStatus, usuarioId);
      return updated;
    });
  }

  /**
   * Reprovar Financeiro
   */
  static async reprovarFinanceiro(id: number, usuarioId?: number, observacao?: string) {
    const pedido = await prisma.pedidoVenda.findUnique({ 
      where: { id },
      include: { movimentacoesEstoque: { where: { tipo: 'RESERVA' } } }
    });
    if (!pedido) throw new Error("Pedido não encontrado");

    const novoStatus = StatusPedido.REPROVADO_FINANCEIRO;
    if (!this.validarTransicao(pedido.tipoPedido, pedido.status, novoStatus)) {
      throw new Error("Ação não permitida no status atual.");
    }

    return prisma.$transaction(async (tx) => {
      // Cancelar reservas
      for (const mov of pedido.movimentacoesEstoque) {
        const estoque = await tx.estoqueAtual.findFirst({
          where: { produtoId: mov.produtoId, loteId: mov.loteId }
        });

        if (estoque) {
          await tx.estoqueAtual.update({
            where: { id: estoque.id },
            data: {
              quantidadeDisponivel: { increment: mov.quantidade },
              quantidadeReservada: { decrement: mov.quantidade }
            }
          });

          await tx.movimentacaoEstoque.create({
            data: {
              produtoId: mov.produtoId,
              loteId: mov.loteId,
              tipo: 'CANCELAMENTO_RESERVA',
              quantidade: mov.quantidade,
              pedidoVendaId: id,
              usuarioId: usuarioId,
              observacao: `Cancelamento por reprovação financeira`
            }
          });
        }
      }

      const updated = await tx.pedidoVenda.update({
        where: { id },
        data: { status: novoStatus }
      });
      await this.registrarHistorico(tx, id, pedido.status, novoStatus, usuarioId, observacao);
      return updated;
    });
  }

  /**
   * Iniciar Separação
   */
  static async iniciarSeparacao(id: number, usuarioId?: number) {
    const pedido = await prisma.pedidoVenda.findUnique({ 
      where: { id },
      include: { itens: true }
    });
    if (!pedido) throw new Error("Pedido não encontrado");

    const novoStatus = StatusPedido.EM_SEPARACAO;
    if (!this.validarTransicao(pedido.tipoPedido, pedido.status, novoStatus)) {
      throw new Error("Ação não permitida no status atual.");
    }

    return prisma.$transaction(async (tx) => {
      // Criar registro na tabela de separação se não existir
      await tx.separacao.upsert({
        where: { pedidoVendaId: id },
        update: { status: 'EM_ANDAMENTO' },
        create: {
          pedidoVendaId: id,
          status: 'EM_ANDAMENTO',
          itens: {
            create: pedido.itens.map(i => ({
              produtoId: i.produtoId,
              quantidade: i.quantidade
            }))
          }
        }
      });

      const updated = await tx.pedidoVenda.update({
        where: { id },
        data: { status: novoStatus }
      });
      await this.registrarHistorico(tx, id, pedido.status, novoStatus, usuarioId);
      return updated;
    });
  }

  /**
   * Finalizar Separação
   */
  static async finalizarSeparacao(id: number, usuarioId?: number) {
    const pedido = await prisma.pedidoVenda.findUnique({ where: { id } });
    if (!pedido) throw new Error("Pedido não encontrado");

    const novoStatus = StatusPedido.SEPARADO;
    if (!this.validarTransicao(pedido.tipoPedido, pedido.status, novoStatus)) {
      throw new Error("Ação não permitida no status atual.");
    }

    return prisma.$transaction(async (tx) => {
      await tx.separacao.update({
        where: { pedidoVendaId: id },
        data: { status: 'CONFERIDO' }
      });

      const updated = await tx.pedidoVenda.update({
        where: { id },
        data: { status: novoStatus }
      });
      await this.registrarHistorico(tx, id, pedido.status, novoStatus, usuarioId);
      return updated;
    });
  }

  /**
   * Faturar Pedido (Apenas NORMAL)
   */
  static async faturarPedido(id: number, usuarioId?: number, dadosFiscal?: { numero: string }) {
    const pedido = await prisma.pedidoVenda.findUnique({ 
      where: { id },
      include: { itens: true, cliente: true }
    });

    if (!pedido) throw new Error("Pedido não encontrado");
    if (pedido.tipoPedido === 'PEDIDO_INTERNO') throw new Error("Pedido Interno não pode ser faturado.");
    if (!pedido.empresaFiscalId) throw new Error("Empresa Fiscal não definida no pedido.");

    const novoStatus = StatusPedido.FATURADO;
    if (!this.validarTransicao(pedido.tipoPedido, pedido.status, novoStatus)) {
      throw new Error("Ação não permitida no status atual.");
    }

    return prisma.$transaction(async (tx) => {
      // 1. Criar Documento Fiscal
      const docFiscal = await tx.documentoFiscal.create({
        data: {
          tipo: TipoDocumentoFiscal.NFE_SAIDA,
          numero: dadosFiscal?.numero || `NF-${pedido.numero}`,
          empresaFiscalId: pedido.empresaFiscalId!,
          clienteId: pedido.clienteId,
          pedidoVendaId: id,
          status: StatusDocumentoFiscal.EMITIDA,
          dataEmissao: new Date()
        }
      });

      // 2. Para cada item: Baixa de estoque (da reserva) e Movimentação Fiscal
      for (const item of pedido.itens) {
        const estoque = await tx.estoqueAtual.findFirst({
          where: { produtoId: item.produtoId, quantidadeReservada: { gte: item.quantidade } }
        });

        if (!estoque) throw new Error(`Estoque reservado não encontrado para produto ${item.produtoId}`);

        await tx.estoqueAtual.update({
          where: { id: estoque.id },
          data: { quantidadeReservada: { decrement: item.quantidade } }
        });

        const movEstoque = await tx.movimentacaoEstoque.create({
          data: {
            produtoId: item.produtoId,
            loteId: estoque.loteId,
            tipo: 'SAIDA',
            quantidade: item.quantidade,
            pedidoVendaId: id,
            usuarioId: usuarioId,
            destino: `Cliente: ${pedido.cliente.razaoSocial}`,
            observacao: `Saída por faturamento`
          }
        });

        await tx.movimentacaoFiscal.create({
          data: {
            movimentacaoEstoqueId: movEstoque.id,
            pedidoVendaId: id,
            clienteId: pedido.clienteId,
            empresaFiscalId: pedido.empresaFiscalId!,
            documentoFiscalId: docFiscal.id,
            produtoId: item.produtoId,
            loteId: estoque.loteId,
            quantidade: item.quantidade,
            valorTotal: item.subtotal,
            status: 'EMITIDA',
            dataEmissao: new Date()
          }
        });
      }

      const updated = await tx.pedidoVenda.update({
        where: { id },
        data: { status: novoStatus }
      });
      await this.registrarHistorico(tx, id, pedido.status, novoStatus, usuarioId);
      return updated;
    });
  }

  /**
   * Despachar Pedido
   */
  static async despacharPedido(id: number, usuarioId?: number, dadosEntrega?: { motorista: string; veiculo: string }) {
    const pedido = await prisma.pedidoVenda.findUnique({ 
      where: { id },
      include: { itens: true, cliente: true }
    });
    if (!pedido) throw new Error("Pedido não encontrado");

    const novoStatus = StatusPedido.EM_TRANSITO;
    if (!this.validarTransicao(pedido.tipoPedido, pedido.status, novoStatus)) {
      throw new Error("Ação não permitida no status atual.");
    }

    return prisma.$transaction(async (tx) => {
      // Se for INTERNO, baixar estoque agora (pois não passou pelo faturamento)
      if (pedido.tipoPedido === 'PEDIDO_INTERNO') {
        for (const item of pedido.itens) {
          const estoque = await tx.estoqueAtual.findFirst({
            where: { produtoId: item.produtoId, quantidadeReservada: { gte: item.quantidade } }
          });

          if (!estoque) throw new Error(`Estoque reservado não encontrado para produto ${item.produtoId}`);

          await tx.estoqueAtual.update({
            where: { id: estoque.id },
            data: { quantidadeReservada: { decrement: item.quantidade } }
          });

          await tx.movimentacaoEstoque.create({
            data: {
              produtoId: item.produtoId,
              loteId: estoque.loteId,
              tipo: 'SAIDA',
              quantidade: item.quantidade,
              pedidoVendaId: id,
              usuarioId: usuarioId,
              destino: `Pedido Interno - ${pedido.cliente.razaoSocial}`,
              observacao: `Saída pedido interno`
            }
          });
        }
      }

      // Criar Romaneio
      await tx.romaneio.create({
        data: {
          separacaoId: (await tx.separacao.findUnique({ where: { pedidoVendaId: id } }))!.id,
          motorista: dadosEntrega?.motorista,
          veiculo: dadosEntrega?.veiculo,
          statusEntrega: 'EM_TRANSITO'
        }
      });

      const updated = await tx.pedidoVenda.update({
        where: { id },
        data: { status: novoStatus }
      });
      await this.registrarHistorico(tx, id, pedido.status, novoStatus, usuarioId);
      return updated;
    });
  }

  /**
   * Confirmar Entrega
   */
  static async confirmarEntrega(id: number, usuarioId?: number) {
    const pedido = await prisma.pedidoVenda.findUnique({ where: { id } });
    if (!pedido) throw new Error("Pedido não encontrado");

    const novoStatus = StatusPedido.ENTREGUE;
    if (!this.validarTransicao(pedido.tipoPedido, pedido.status, novoStatus)) {
      throw new Error("Ação não permitida no status atual.");
    }

    return prisma.$transaction(async (tx) => {
      const updated = await tx.pedidoVenda.update({
        where: { id },
        data: { status: novoStatus }
      });
      await this.registrarHistorico(tx, id, pedido.status, novoStatus, usuarioId);
      return updated;
    });
  }

  /**
   * Finalizar Pedido
   */
  static async finalizarPedido(id: number, usuarioId?: number) {
    const pedido = await prisma.pedidoVenda.findUnique({ where: { id } });
    if (!pedido) throw new Error("Pedido não encontrado");

    const novoStatus = StatusPedido.FINALIZADO;
    if (!this.validarTransicao(pedido.tipoPedido, pedido.status, novoStatus)) {
      throw new Error("Ação não permitida no status atual.");
    }

    return prisma.$transaction(async (tx) => {
      const updated = await tx.pedidoVenda.update({
        where: { id },
        data: { status: novoStatus }
      });
      await this.registrarHistorico(tx, id, pedido.status, novoStatus, usuarioId);
      return updated;
    });
  }

  /**
   * Cancelar Pedido (Apenas antes de Faturado)
   */
  static async cancelarPedido(id: number, usuarioId?: number, observacao?: string) {
    const pedido = await prisma.pedidoVenda.findUnique({ 
      where: { id },
      include: { movimentacoesEstoque: { where: { tipo: 'RESERVA' } } }
    });
    if (!pedido) throw new Error("Pedido não encontrado");

    const novoStatus = StatusPedido.CANCELADO;
    if (!this.validarTransicao(pedido.tipoPedido, pedido.status, novoStatus)) {
      throw new Error("O pedido não pode ser cancelado neste status.");
    }

    return prisma.$transaction(async (tx) => {
      // Liberar reservas se houver
      for (const mov of pedido.movimentacoesEstoque) {
        // Verificar se essa reserva já não foi cancelada
        const cancelada = await tx.movimentacaoEstoque.findFirst({
          where: { tipo: 'CANCELAMENTO_RESERVA', observacao: { contains: String(mov.id) } }
        });

        if (!cancelada) {
          const estoque = await tx.estoqueAtual.findFirst({
            where: { produtoId: mov.produtoId, loteId: mov.loteId }
          });

          if (estoque) {
            await tx.estoqueAtual.update({
              where: { id: estoque.id },
              data: {
                quantidadeDisponivel: { increment: mov.quantidade },
                quantidadeReservada: { decrement: mov.quantidade }
              }
            });

            await tx.movimentacaoEstoque.create({
              data: {
                produtoId: mov.produtoId,
                loteId: mov.loteId,
                tipo: 'CANCELAMENTO_RESERVA',
                quantidade: mov.quantidade,
                pedidoVendaId: id,
                usuarioId: usuarioId,
                observacao: `Cancelamento de pedido #${id} (Ref Reserva #${mov.id})`
              }
            });
          }
        }
      }

      const updated = await tx.pedidoVenda.update({
        where: { id },
        data: { status: novoStatus }
      });
      await this.registrarHistorico(tx, id, pedido.status, novoStatus, usuarioId, observacao);
      return updated;
    });
  }
}
