import { prisma } from "@/lib/prisma";
import { TipoMovimentacao, StatusEstoque, RegimeTributario, Prisma } from "@prisma/client";
import { computeDiff, registrarAlteracao } from "./auditoria.service";

export const CAMPOS_AUDITAVEIS_LOTE = [
  "validade",
  "precoCusto",
  "enderecoEstoque",
  "numeroLote",
  "fornecedorId",
  "codigoProdutoLegado",
  "nomeProdutoOrigem",
  "fornecedorOrigem",
  "fornecedorLegadoId",
  "marcaOrigem",
  "gtinOrigem",
  "unidadeOrigem",
  "situacaoOrigem",
  "observacoesOrigem",
  "estoqueMinimoOrigem",
  "estoqueMaximoOrigem",
  "valorVendaOrigem",
  "valorCustoOrigem",
  "linhaFonteOrigem",
] as const;

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
    codigoProdutoLegado?: string;
    nomeProdutoOrigem?: string;
    fornecedorOrigem?: string;
    fornecedorLegadoId?: string;
    marcaOrigem?: string;
    gtinOrigem?: string;
    unidadeOrigem?: string;
    situacaoOrigem?: string;
    observacoesOrigem?: string;
    estoqueMinimoOrigem?: number;
    estoqueMaximoOrigem?: number;
    valorVendaOrigem?: number;
    valorCustoOrigem?: number;
    linhaFonteOrigem?: number;
    fonteImportacao?: string;
    dadosOrigem?: Prisma.InputJsonValue;
  }) {
    if (data.validade) {
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      const val = new Date(data.validade);
      val.setHours(0, 0, 0, 0);
      if (val < hoje) {
        throw new Error(`Lote ${data.numeroLote || ""} com validade ${val.toLocaleDateString("pt-BR")} já está vencido. Entrada não permitida.`);
      }
    }

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
            precoCusto: data.custoUnitario,
            codigoProdutoLegado: data.codigoProdutoLegado,
            nomeProdutoOrigem: data.nomeProdutoOrigem,
            fornecedorOrigem: data.fornecedorOrigem,
            fornecedorLegadoId: data.fornecedorLegadoId,
            marcaOrigem: data.marcaOrigem,
            gtinOrigem: data.gtinOrigem,
            unidadeOrigem: data.unidadeOrigem,
            situacaoOrigem: data.situacaoOrigem,
            observacoesOrigem: data.observacoesOrigem,
            estoqueMinimoOrigem: data.estoqueMinimoOrigem,
            estoqueMaximoOrigem: data.estoqueMaximoOrigem,
            valorVendaOrigem: data.valorVendaOrigem,
            valorCustoOrigem: data.valorCustoOrigem,
            linhaFonteOrigem: data.linhaFonteOrigem,
            dadosOrigem: data.dadosOrigem
          },
          create: {
            numeroLote: data.numeroLote,
            validade: data.validade,
            produtoId: data.produtoId,
            localizacaoId: data.localizacaoId,
            fornecedorId: data.fornecedorId,
            enderecoEstoque: data.enderecoEstoque,
            status: data.status || 'DISPONIVEL',
            precoCusto: data.custoUnitario,
            codigoProdutoLegado: data.codigoProdutoLegado,
            nomeProdutoOrigem: data.nomeProdutoOrigem,
            fornecedorOrigem: data.fornecedorOrigem,
            fornecedorLegadoId: data.fornecedorLegadoId,
            marcaOrigem: data.marcaOrigem,
            gtinOrigem: data.gtinOrigem,
            unidadeOrigem: data.unidadeOrigem,
            situacaoOrigem: data.situacaoOrigem,
            observacoesOrigem: data.observacoesOrigem,
            estoqueMinimoOrigem: data.estoqueMinimoOrigem,
            estoqueMaximoOrigem: data.estoqueMaximoOrigem,
            valorVendaOrigem: data.valorVendaOrigem,
            valorCustoOrigem: data.valorCustoOrigem,
            linhaFonteOrigem: data.linhaFonteOrigem,
            dadosOrigem: data.dadosOrigem
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
          origem: data.fonteImportacao || 'Entrada Manual',
          fonteImportacao: data.fonteImportacao,
          linhaFonteOrigem: data.linhaFonteOrigem,
          codigoProdutoLegado: data.codigoProdutoLegado,
          dadosOrigem: data.dadosOrigem
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
            status: 'AUTORIZADA',
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

  /**
   * Estorna uma entrada de estoque
   */
  static async estornarEntrada(movimentacaoId: number, usuarioId?: number) {
    return prisma.$transaction(async (tx) => {
      // 1. Obter a movimentação original com a relação de estorno
      const mov = await tx.movimentacaoEstoque.findUnique({
        where: { id: movimentacaoId },
        include: { estornadoPor: true }
      });

      if (!mov) {
        throw new Error("Movimentação não encontrada.");
      }

      if (mov.tipo !== "ENTRADA") {
        throw new Error("Apenas movimentações de entrada podem ser estornadas.");
      }

      if (mov.estornadoPor) {
        throw new Error("Esta entrada já foi estornada.");
      }

      // 2. Buscar o EstoqueAtual correspondente
      const estoque = await tx.estoqueAtual.findFirst({
        where: {
          produtoId: mov.produtoId,
          loteId: mov.loteId,
          localizacaoId: mov.localizacaoId
        }
      });

      const qtdDisponivel = estoque?.quantidadeDisponivel || 0;
      const qtdReservada = estoque?.quantidadeReservada || 0;

      if (qtdDisponivel < mov.quantidade) {
        throw new Error(
          `Estorno bloqueado: apenas ${qtdDisponivel} unidades disponíveis. ${qtdReservada} unidades estão reservadas para pedidos em andamento.`
        );
      }

      // 3. Decrementar do EstoqueAtual
      await tx.estoqueAtual.update({
        where: { id: estoque!.id },
        data: {
          quantidadeDisponivel: { decrement: mov.quantidade }
        }
      });

      // 4. Criar a nova movimentação de estorno (tipo AJUSTE)
      const estornoMov = await tx.movimentacaoEstoque.create({
        data: {
          produtoId: mov.produtoId,
          loteId: mov.loteId,
          tipo: "AJUSTE",
          quantidade: mov.quantidade,
          usuarioId: usuarioId,
          localizacaoId: mov.localizacaoId,
          estornoDeMovimentacaoId: mov.id,
          observacao: `Estorno da entrada #${mov.id}`,
          origem: "Sistema (Estorno)"
        }
      });

      return estornoMov;
    });
  }

  /**
   * Bloqueia ou coloca em quarentena um lote manualmente
   */
  static async bloquearLote(data: {
    loteId: number;
    status: "QUARENTENA" | "BLOQUEADO";
    motivo: string;
    usuarioId: number;
  }): Promise<void> {
    return prisma.$transaction(async (tx) => {
      const lote = await tx.lote.findUnique({
        where: { id: data.loteId },
        include: { estoqueAtual: true }
      });

      if (!lote) throw new Error("Lote não encontrado.");

      // 1. Atualizar o Lote
      await tx.lote.update({
        where: { id: data.loteId },
        data: {
          status: data.status,
          motivoBloqueio: data.motivo,
          bloqueadoEm: new Date(),
          bloqueadoPor: data.usuarioId
        }
      });

      // 2. Atualizar todos os EstoqueAtual deste lote
      await tx.estoqueAtual.updateMany({
        where: { loteId: data.loteId },
        data: { status: data.status }
      });

      // Calcular quantidade disponível
      const totalDisponivel = lote.estoqueAtual.reduce((sum, item) => sum + item.quantidadeDisponivel, 0);

      // 3. Criar MovimentacaoEstoque de tipo BLOQUEIO
      await tx.movimentacaoEstoque.create({
        data: {
          produtoId: lote.produtoId,
          loteId: lote.id,
          tipo: "BLOQUEIO",
          quantidade: totalDisponivel,
          observacao: `Bloqueio manual (${data.status}) — Motivo: ${data.motivo}`,
          usuarioId: data.usuarioId,
          origem: "Bloqueio Manual"
        }
      });
    });
  }

  /**
   * Edita campos de cadastro do Lote e gera auditoria
   */
  static async editarLote(
    loteId: number,
    data: {
      validade?: Date | null;
      precoCusto?: number | null;
      enderecoEstoque?: string | null;
      numeroLote?: string;
      fornecedorId?: number | null;
    },
    motivo: string,
    usuarioId?: number
  ): Promise<any> {
    return prisma.$transaction(async (tx) => {
      const loteAtual = await tx.lote.findUnique({
        where: { id: loteId }
      });

      if (!loteAtual) {
        throw new Error("Lote não encontrado.");
      }

      // Validação de validade futura (se fornecida, não for null e for diferente da atual)
      if (data.validade && data.validade.getTime() !== loteAtual.validade?.getTime()) {
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        const dataValidade = new Date(data.validade);
        dataValidade.setHours(0, 0, 0, 0);
        if (dataValidade < hoje) {
          throw new Error(
            "Validade informada já está vencida. Para bloquear um lote vencido, use o fluxo de quarentena."
          );
        }
      }

      // Normalização da data de validade para meia-noite UTC (evitar diffs falsos por timezone)
      if (data.validade) {
        data.validade = new Date(
          Date.UTC(
            data.validade.getFullYear(),
            data.validade.getMonth(),
            data.validade.getDate()
          )
        );
      }

      // Validação de numeroLote (não pode ser vazio se enviado)
      if (data.numeroLote !== undefined && (!data.numeroLote || data.numeroLote.trim() === "")) {
        throw new Error("Número do lote é obrigatório.");
      }

      // Validação de numeroLote único por produtoId
      if (data.numeroLote && data.numeroLote !== loteAtual.numeroLote) {
        const loteExistente = await tx.lote.findUnique({
          where: {
            numeroLote_produtoId: {
              numeroLote: data.numeroLote,
              produtoId: loteAtual.produtoId,
            },
          },
        });
        if (loteExistente) {
          throw new Error("Já existe outro lote com esse número para este produto.");
        }
      }

      // Se precoCusto for alterado, atualiza também EstoqueAtual.custoUnitario
      if (data.precoCusto !== undefined && data.precoCusto !== loteAtual.precoCusto) {
        await tx.estoqueAtual.updateMany({
          where: { loteId },
          data: { custoUnitario: data.precoCusto ?? 0 },
        });
      }

      const diffs = computeDiff(loteAtual, data as any, CAMPOS_AUDITAVEIS_LOTE as any);

      const loteAtualizado = await tx.lote.update({
        where: { id: loteId },
        data,
      });

      if (diffs.length > 0) {
        await registrarAlteracao(tx, {
          entidade: "LOTE",
          entidadeId: loteId,
          diffs,
          motivo,
          usuarioId,
        });
      }

      return loteAtualizado;
    });
  }

  /**
   * Edita uma movimentação de entrada de estoque e atualiza o saldo
   */
  static async editarMovimentacaoEntrada(
    movimentacaoId: number,
    data: {
      quantidade?: number;
      observacao?: string | null;
      origem?: string | null;
    },
    motivo: string,
    usuarioId?: number
  ): Promise<any> {
    return prisma.$transaction(async (tx) => {
      const mov = await tx.movimentacaoEstoque.findUnique({
        where: { id: movimentacaoId },
        include: { estornadoPor: true }
      });

      if (!mov) {
        throw new Error("Movimentação não encontrada.");
      }

      if (mov.tipo !== "ENTRADA") {
        throw new Error("Apenas movimentações de entrada podem ser editadas.");
      }

      if (mov.estornadoPor) {
        throw new Error("Esta entrada já foi estornada e não pode ser editada.");
      }

      if (data.quantidade !== undefined) {
        if (data.quantidade <= 0) {
          throw new Error("Quantidade deve ser maior que zero.");
        }

        const delta = data.quantidade - mov.quantidade;
        if (delta !== 0) {
          const estoqueAtual = await tx.estoqueAtual.findFirst({
            where: {
              produtoId: mov.produtoId,
              loteId: mov.loteId,
              localizacaoId: mov.localizacaoId,
            }
          });

          if (!estoqueAtual) {
            throw new Error("Saldo de estoque correspondente não encontrado.");
          }

          if (delta < 0 && estoqueAtual.quantidadeDisponivel + delta < 0) {
            throw new Error(
              `Não é possível reduzir a quantidade: as unidades estão comprometidas (saldo disponível atual: ${estoqueAtual.quantidadeDisponivel}).`
            );
          }

          await tx.estoqueAtual.update({
            where: { id: estoqueAtual.id },
            data: {
              quantidadeDisponivel: { increment: delta }
            }
          });
        }
      }

      const diffs = computeDiff(mov, data as any, CAMPOS_AUDITAVEIS_MOVIMENTACAO as any);

      const movAtualizada = await tx.movimentacaoEstoque.update({
        where: { id: movimentacaoId },
        data
      });

      if (diffs.length > 0) {
        await registrarAlteracao(tx, {
          entidade: "MOVIMENTACAO_ESTOQUE",
          entidadeId: movimentacaoId,
          diffs,
          motivo,
          usuarioId,
        });
      }

      return movAtualizada;
    });
  }
}

export const CAMPOS_AUDITAVEIS_MOVIMENTACAO = [
  "quantidade",
  "observacao",
  "origem",
] as const;
