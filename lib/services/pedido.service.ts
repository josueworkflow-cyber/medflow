import { prisma } from "@/lib/prisma";
import {
  FormaPagamento,
  PerfilUsuario,
  Prisma,
  StatusDocumentoFiscal,
  StatusPedido,
  TipoDocumentoFiscal,
  TipoPedido,
} from "@prisma/client";
import { FiscalOrquestradorService } from "@/lib/services/fiscal/fiscal-orquestrador.service";
import { enviarEmailFiscal } from "@/lib/services/fiscal/nfe/nfe-email.service";
import { calculateOrderTaxes } from "@/lib/services/fiscal/tributario/tax-engine.service";


export type PedidoActor = {
  usuarioId?: number;
  perfil?: PerfilUsuario | null;
};

type ClienteFiscalFaturamento = {
  razaoSocial?: string | null;
  nomeFantasia?: string | null;
  cnpjCpf?: string | null;
  email?: string | null;
  telefone?: string | null;
  logradouro?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  estado?: string | null;
  cep?: string | null;
  codigoMunicipio?: string | null;
  inscricaoEstadual?: string | null;
  contribuinteICMS?: boolean;
  consumidorFinal?: boolean;
};

type DadosFaturamentoFiscal = {
  numero?: string;
  empresaFiscalId?: number;
  naturezaOperacaoId?: number;
  naturezaOperacao?: string | null;
  informacoesComplementares?: string | null;
  observacao?: string | null;
  formaPagamento?: FormaPagamento | null;
  prazoPagamento?: string | null;
  cliente?: ClienteFiscalFaturamento;
};

type PassoStatus = {
  status: StatusPedido;
  observacao?: string;
  tipoAcao: string;
};

type ReservaPendente = {
  produtoId: number;
  loteId: number | null;
  quantidade: number;
};

const TODOS_STATUS: StatusPedido[] = Object.values(StatusPedido);

function nullableTrim(value: string | null | undefined): string | null | undefined {
  if (value === undefined) return undefined;
  const trimmed = (value || "").trim();
  return trimmed ? trimmed : null;
}

function requiredTrim(value: string | null | undefined): string | undefined {
  if (value === undefined || value === null) return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

function buildClienteFiscalUpdate(cliente?: ClienteFiscalFaturamento): Prisma.ClienteUpdateInput | null {
  if (!cliente) return null;

  const logradouro = nullableTrim(cliente.logradouro);
  const numero = nullableTrim(cliente.numero);
  const endereco =
    logradouro !== undefined || numero !== undefined
      ? [logradouro, numero].filter(Boolean).join(", ") || null
      : undefined;

  const data: Prisma.ClienteUpdateInput = {
    razaoSocial: requiredTrim(cliente.razaoSocial),
    nomeFantasia: nullableTrim(cliente.nomeFantasia),
    cnpjCpf: nullableTrim(cliente.cnpjCpf),
    email: nullableTrim(cliente.email),
    telefone: nullableTrim(cliente.telefone),
    logradouro,
    numero,
    complemento: nullableTrim(cliente.complemento),
    bairro: nullableTrim(cliente.bairro),
    cidade: nullableTrim(cliente.cidade),
    estado: nullableTrim(cliente.estado)?.toUpperCase(),
    cep: nullableTrim(cliente.cep),
    codigoMunicipio: nullableTrim(cliente.codigoMunicipio),
    inscricaoEstadual: nullableTrim(cliente.inscricaoEstadual),
    endereco,
    contribuinteICMS: typeof cliente.contribuinteICMS === "boolean" ? cliente.contribuinteICMS : undefined,
    consumidorFinal: typeof cliente.consumidorFinal === "boolean" ? cliente.consumidorFinal : undefined,
  };

  return Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined)) as Prisma.ClienteUpdateInput;
}

export class PedidoService {
  private static transicoes: Record<TipoPedido, Partial<Record<StatusPedido, StatusPedido[]>>> = {
    PEDIDO_NORMAL: {
      PEDIDO_CRIADO: [
        StatusPedido.AGUARDANDO_ESTOQUE,
        StatusPedido.ESTOQUE_CONFIRMADO,
        StatusPedido.ESTOQUE_PARCIAL,
        StatusPedido.ESTOQUE_INDISPONIVEL,
        StatusPedido.CANCELADO,
      ],
      AGUARDANDO_ESTOQUE: [
        StatusPedido.ESTOQUE_CONFIRMADO,
        StatusPedido.ESTOQUE_PARCIAL,
        StatusPedido.ESTOQUE_INDISPONIVEL,
        StatusPedido.AGUARDANDO_FORNECEDOR,
        StatusPedido.PEDIDO_EM_REVISAO,
        StatusPedido.CANCELADO,
      ],
      ESTOQUE_CONFIRMADO: [StatusPedido.AGUARDANDO_APROVACAO_FINANCEIRA, StatusPedido.CANCELADO],
      ESTOQUE_PARCIAL: [
        StatusPedido.ESTOQUE_CONFIRMADO,
        StatusPedido.AGUARDANDO_FORNECEDOR,
        StatusPedido.PEDIDO_EM_REVISAO,
        StatusPedido.CANCELADO,
      ],
      ESTOQUE_INDISPONIVEL: [
        StatusPedido.ESTOQUE_CONFIRMADO,
        StatusPedido.AGUARDANDO_FORNECEDOR,
        StatusPedido.PEDIDO_EM_REVISAO,
        StatusPedido.CANCELADO,
      ],
      AGUARDANDO_FORNECEDOR: [
        StatusPedido.ESTOQUE_CONFIRMADO,
        StatusPedido.PEDIDO_EM_REVISAO,
        StatusPedido.CANCELADO,
      ],
      AGUARDANDO_APROVACAO_FINANCEIRA: [
        StatusPedido.APROVADO_FINANCEIRO,
        StatusPedido.REPROVADO_FINANCEIRO,
        StatusPedido.PAGAMENTO_PENDENTE,
        StatusPedido.CONDICAO_COMERCIAL_PENDENTE,
        StatusPedido.PEDIDO_EM_REVISAO,
        StatusPedido.CANCELADO,
      ],
      APROVADO_FINANCEIRO: [StatusPedido.AGUARDANDO_CONFIRMACAO_CLIENTE, StatusPedido.CANCELADO],
      REPROVADO_FINANCEIRO: [
        StatusPedido.PEDIDO_EM_REVISAO,
        StatusPedido.AGUARDANDO_APROVACAO_FINANCEIRA,
        StatusPedido.CANCELADO,
      ],
      PAGAMENTO_PENDENTE: [
        StatusPedido.AGUARDANDO_APROVACAO_FINANCEIRA,
        StatusPedido.REPROVADO_FINANCEIRO,
        StatusPedido.PEDIDO_EM_REVISAO,
        StatusPedido.CANCELADO,
      ],
      CONDICAO_COMERCIAL_PENDENTE: [
        StatusPedido.AGUARDANDO_APROVACAO_FINANCEIRA,
        StatusPedido.REPROVADO_FINANCEIRO,
        StatusPedido.PEDIDO_EM_REVISAO,
        StatusPedido.CANCELADO,
      ],
      AGUARDANDO_CONFIRMACAO_CLIENTE: [
        StatusPedido.CLIENTE_CONFIRMOU,
        StatusPedido.CANCELADO_PELO_CLIENTE,
        StatusPedido.PEDIDO_EM_REVISAO,
      ],
      CLIENTE_CONFIRMOU: [StatusPedido.AGUARDANDO_FATURAMENTO, StatusPedido.CANCELADO],
      PEDIDO_EM_REVISAO: [
        StatusPedido.PEDIDO_CRIADO,
        StatusPedido.AGUARDANDO_ESTOQUE,
        StatusPedido.CANCELADO,
      ],
      AGUARDANDO_FATURAMENTO: [
        StatusPedido.FATURADO,
        StatusPedido.PAGAMENTO_PENDENTE,
        StatusPedido.CONDICAO_COMERCIAL_PENDENTE,
        StatusPedido.PEDIDO_EM_REVISAO,
        StatusPedido.CANCELADO,
      ],
      FATURADO: [StatusPedido.AUTORIZADO_PARA_SEPARACAO],
      AUTORIZADO_PARA_SEPARACAO: [StatusPedido.EM_SEPARACAO, StatusPedido.CANCELADO],
      EM_SEPARACAO: [StatusPedido.SEPARADO, StatusPedido.CANCELADO],
      SEPARADO: [StatusPedido.DESPACHADO],
      DESPACHADO: [StatusPedido.FINALIZADO],
      FINALIZADO: [],
      CANCELADO: [],
      CANCELADO_PELO_CLIENTE: [],
    },
    PEDIDO_INTERNO: {
      PEDIDO_CRIADO: [
        StatusPedido.AGUARDANDO_ESTOQUE,
        StatusPedido.ESTOQUE_CONFIRMADO,
        StatusPedido.ESTOQUE_PARCIAL,
        StatusPedido.ESTOQUE_INDISPONIVEL,
        StatusPedido.CANCELADO,
      ],
      AGUARDANDO_ESTOQUE: [
        StatusPedido.ESTOQUE_CONFIRMADO,
        StatusPedido.ESTOQUE_PARCIAL,
        StatusPedido.ESTOQUE_INDISPONIVEL,
        StatusPedido.AGUARDANDO_FORNECEDOR,
        StatusPedido.PEDIDO_EM_REVISAO,
        StatusPedido.CANCELADO,
      ],
      ESTOQUE_CONFIRMADO: [StatusPedido.AGUARDANDO_APROVACAO_FINANCEIRA, StatusPedido.CANCELADO],
      ESTOQUE_PARCIAL: [
        StatusPedido.ESTOQUE_CONFIRMADO,
        StatusPedido.AGUARDANDO_FORNECEDOR,
        StatusPedido.PEDIDO_EM_REVISAO,
        StatusPedido.CANCELADO,
      ],
      ESTOQUE_INDISPONIVEL: [
        StatusPedido.ESTOQUE_CONFIRMADO,
        StatusPedido.AGUARDANDO_FORNECEDOR,
        StatusPedido.PEDIDO_EM_REVISAO,
        StatusPedido.CANCELADO,
      ],
      AGUARDANDO_FORNECEDOR: [
        StatusPedido.ESTOQUE_CONFIRMADO,
        StatusPedido.PEDIDO_EM_REVISAO,
        StatusPedido.CANCELADO,
      ],
      AGUARDANDO_APROVACAO_FINANCEIRA: [
        StatusPedido.APROVADO_FINANCEIRO,
        StatusPedido.REPROVADO_FINANCEIRO,
        StatusPedido.PAGAMENTO_PENDENTE,
        StatusPedido.CONDICAO_COMERCIAL_PENDENTE,
        StatusPedido.PEDIDO_EM_REVISAO,
        StatusPedido.CANCELADO,
      ],
      APROVADO_FINANCEIRO: [StatusPedido.AGUARDANDO_CONFIRMACAO_CLIENTE, StatusPedido.CANCELADO],
      REPROVADO_FINANCEIRO: [
        StatusPedido.PEDIDO_EM_REVISAO,
        StatusPedido.AGUARDANDO_APROVACAO_FINANCEIRA,
        StatusPedido.CANCELADO,
      ],
      PAGAMENTO_PENDENTE: [
        StatusPedido.AGUARDANDO_APROVACAO_FINANCEIRA,
        StatusPedido.REPROVADO_FINANCEIRO,
        StatusPedido.PEDIDO_EM_REVISAO,
        StatusPedido.CANCELADO,
      ],
      CONDICAO_COMERCIAL_PENDENTE: [
        StatusPedido.AGUARDANDO_APROVACAO_FINANCEIRA,
        StatusPedido.REPROVADO_FINANCEIRO,
        StatusPedido.PEDIDO_EM_REVISAO,
        StatusPedido.CANCELADO,
      ],
      AGUARDANDO_CONFIRMACAO_CLIENTE: [
        StatusPedido.CLIENTE_CONFIRMOU,
        StatusPedido.CANCELADO_PELO_CLIENTE,
        StatusPedido.PEDIDO_EM_REVISAO,
      ],
      CLIENTE_CONFIRMOU: [StatusPedido.AGUARDANDO_FATURAMENTO, StatusPedido.CANCELADO],
      PEDIDO_EM_REVISAO: [
        StatusPedido.PEDIDO_CRIADO,
        StatusPedido.AGUARDANDO_ESTOQUE,
        StatusPedido.CANCELADO,
      ],
      AGUARDANDO_FATURAMENTO: [
        StatusPedido.PEDIDO_INTERNO_AUTORIZADO,
        StatusPedido.PAGAMENTO_PENDENTE,
        StatusPedido.CONDICAO_COMERCIAL_PENDENTE,
        StatusPedido.PEDIDO_EM_REVISAO,
        StatusPedido.CANCELADO,
      ],
      PEDIDO_INTERNO_AUTORIZADO: [StatusPedido.AUTORIZADO_PARA_SEPARACAO],
      AUTORIZADO_PARA_SEPARACAO: [StatusPedido.EM_SEPARACAO, StatusPedido.CANCELADO],
      EM_SEPARACAO: [StatusPedido.SEPARADO, StatusPedido.CANCELADO],
      SEPARADO: [StatusPedido.DESPACHADO],
      DESPACHADO: [StatusPedido.FINALIZADO],
      FINALIZADO: [],
      CANCELADO: [],
      CANCELADO_PELO_CLIENTE: [],
    },
  };

  static validarTransicao(tipo: TipoPedido, atual: StatusPedido, novo: StatusPedido): boolean {
    if (atual === novo) return true;
    const permitidas = this.transicoes[tipo][atual] || [];
    return permitidas.includes(novo);
  }

  private static assertPerfil(actor: PedidoActor | undefined, perfis: PerfilUsuario[]) {
    if (actor?.perfil === PerfilUsuario.ADMINISTRADOR) return;
    if (!actor?.perfil) throw new Error("Autenticacao obrigatoria.");
    if (!perfis.includes(actor.perfil)) {
      throw new Error("Usuario sem permissao para executar esta acao.");
    }
  }

  private static responsavel(status: StatusPedido): PerfilUsuario[] {
    const estoque: StatusPedido[] = [
      StatusPedido.PEDIDO_CRIADO,
      StatusPedido.AGUARDANDO_ESTOQUE,
      StatusPedido.ESTOQUE_PARCIAL,
      StatusPedido.ESTOQUE_INDISPONIVEL,
      StatusPedido.ESTOQUE_CONFIRMADO,
      StatusPedido.AGUARDANDO_FORNECEDOR,
      StatusPedido.AUTORIZADO_PARA_SEPARACAO,
      StatusPedido.EM_SEPARACAO,
      StatusPedido.SEPARADO,
    ];
    const financeiro: StatusPedido[] = [
      StatusPedido.AGUARDANDO_APROVACAO_FINANCEIRA,
      StatusPedido.PAGAMENTO_PENDENTE,
      StatusPedido.CONDICAO_COMERCIAL_PENDENTE,
      StatusPedido.AGUARDANDO_FATURAMENTO,
      StatusPedido.CLIENTE_CONFIRMOU,
      StatusPedido.FATURADO,
      StatusPedido.PEDIDO_INTERNO_AUTORIZADO,
    ];
    const vendas: StatusPedido[] = [
      StatusPedido.AGUARDANDO_CONFIRMACAO_CLIENTE,
      StatusPedido.APROVADO_FINANCEIRO,
      StatusPedido.REPROVADO_FINANCEIRO,
      StatusPedido.PEDIDO_EM_REVISAO,
    ];

    if (estoque.includes(status)) return [PerfilUsuario.ESTOQUE];
    if (financeiro.includes(status)) return [PerfilUsuario.FINANCEIRO];
    if (vendas.includes(status)) return [PerfilUsuario.VENDAS];
    return [];
  }

  private static assertResponsavel(status: StatusPedido, actor?: PedidoActor) {
    if (actor?.perfil === PerfilUsuario.ADMINISTRADOR) return;
    const perfis = this.responsavel(status);
    if (!perfis.length) throw new Error("Pedido nao permite alteracao nesta etapa.");
    this.assertPerfil(actor, perfis);
  }

  private static assertEditavel(status: StatusPedido) {
    const bloqueados: StatusPedido[] = [
      StatusPedido.FATURADO,
      StatusPedido.PEDIDO_INTERNO_AUTORIZADO,
      StatusPedido.AUTORIZADO_PARA_SEPARACAO,
      StatusPedido.EM_SEPARACAO,
      StatusPedido.SEPARADO,
      StatusPedido.DESPACHADO,
      StatusPedido.FINALIZADO,
      StatusPedido.CANCELADO,
      StatusPedido.CANCELADO_PELO_CLIENTE,
    ];
    if (bloqueados.includes(status)) {
      throw new Error("Pedido nao permite edicao comum nesta etapa.");
    }
  }

  private static async registrarHistorico(
    tx: Prisma.TransactionClient,
    pedidoId: number,
    anterior: StatusPedido | null,
    novo: StatusPedido,
    actor?: PedidoActor,
    observacao?: string,
    tipoAcao?: string
  ) {
    return tx.historicoPedido.create({
      data: {
        pedidoVendaId: pedidoId,
        statusAnterior: anterior,
        statusNovo: novo,
        usuarioId: actor?.usuarioId,
        setor: actor?.perfil || null,
        tipoAcao,
        observacao,
      },
    });
  }

  private static validarStatusConhecido(status: StatusPedido) {
    if (!TODOS_STATUS.includes(status)) {
      throw new Error(`Status invalido: ${status}`);
    }
  }

  private static async aplicarStatus(
    tx: Prisma.TransactionClient,
    pedido: any,
    passo: PassoStatus,
    actor?: PedidoActor
  ) {
    this.validarStatusConhecido(passo.status);
    if (!this.validarTransicao(pedido.tipoPedido, pedido.status, passo.status)) {
      throw new Error(`Transicao de ${pedido.status} para ${passo.status} nao permitida.`);
    }

    const anterior = pedido.status;
    const atualizado = await tx.pedidoVenda.update({
      where: { id: pedido.id },
      data: { status: passo.status },
    });
    await this.registrarHistorico(
      tx,
      pedido.id,
      anterior,
      passo.status,
      actor,
      passo.observacao,
      passo.tipoAcao
    );
    pedido.status = passo.status;
    return atualizado;
  }

  private static async carregarPedido(id: number) {
    const pedido = await prisma.pedidoVenda.findUnique({
      where: { id },
      include: {
        cliente: true,
        itens: true,
        documentosFiscais: true,
        movimentacoesEstoque: {
          where: { tipo: { in: ["RESERVA", "CANCELAMENTO_RESERVA"] } },
          orderBy: { createdAt: "asc" },
        },
      },
    });
    if (!pedido) throw new Error("Pedido nao encontrado.");
    return pedido;
  }

  private static async transicionarEmCadeia(
    id: number,
    passos: PassoStatus[],
    actor?: PedidoActor,
    extraLogic?: (tx: Prisma.TransactionClient, pedido: any) => Promise<void>
  ) {
    const pedido = await this.carregarPedido(id);

    return prisma.$transaction(async (tx) => {
      if (extraLogic) await extraLogic(tx, pedido);
      let atualizado: any = pedido;
      for (const passo of passos) {
        atualizado = await this.aplicarStatus(tx, pedido, passo, actor);
      }
      return atualizado;
    });
  }

  private static reservasPendentes(pedido: any): ReservaPendente[] {
    const mapa = new Map<string, ReservaPendente>();

    for (const mov of pedido.movimentacoesEstoque || []) {
      const chave = `${mov.produtoId}:${mov.loteId ?? "sem-lote"}`;
      const atual = mapa.get(chave) || {
        produtoId: mov.produtoId,
        loteId: mov.loteId,
        quantidade: 0,
      };

      if (mov.tipo === "RESERVA") atual.quantidade += mov.quantidade;
      if (mov.tipo === "CANCELAMENTO_RESERVA") atual.quantidade -= mov.quantidade;
      mapa.set(chave, atual);
    }

    return [...mapa.values()].filter((r) => r.quantidade > 0.000001);
  }

  private static async cancelarReservas(
    tx: Prisma.TransactionClient,
    pedido: any,
    actor?: PedidoActor,
    observacao = "Cancelamento de reserva"
  ) {
    for (const reserva of this.reservasPendentes(pedido)) {
      const estoque = await tx.estoqueAtual.findFirst({
        where: {
          produtoId: reserva.produtoId,
          loteId: reserva.loteId,
        },
      });
      if (!estoque) continue;

      await tx.estoqueAtual.update({
        where: { id: estoque.id },
        data: {
          quantidadeDisponivel: { increment: reserva.quantidade },
          quantidadeReservada: { decrement: reserva.quantidade },
        },
      });

      await tx.movimentacaoEstoque.create({
        data: {
          produtoId: reserva.produtoId,
          loteId: reserva.loteId,
          tipo: "CANCELAMENTO_RESERVA",
          quantidade: reserva.quantidade,
          pedidoVendaId: pedido.id,
          usuarioId: actor?.usuarioId,
          observacao,
        },
      });
    }
  }

  private static async reservarItens(
    tx: Prisma.TransactionClient,
    pedido: any,
    actor?: PedidoActor,
    origem = "Reserva automatica"
  ) {
    await this.cancelarReservas(tx, pedido, actor, "Cancelamento antes de nova reserva");

    for (const item of pedido.itens) {
      // Validar se há pelo menos um lote ativo não vencido disponível (FEFO)
      const loteValido = await tx.lote.findFirst({
        where: {
          produtoId: item.produtoId,
          status: "DISPONIVEL",
          validade: { gt: new Date() }
        },
        include: { produto: true },
        orderBy: { validade: "asc" }
      });

      if (!loteValido) {
        const produtoObj = await tx.produto.findUnique({ where: { id: item.produtoId } });
        throw new Error(`Produto ${produtoObj?.descricao || item.produtoId} sem lote disponível válido`);
      }

      let restante = item.quantidade;
      const saldos = await tx.estoqueAtual.findMany({
        where: {
          produtoId: item.produtoId,
          quantidadeDisponivel: { gt: 0 },
          status: "DISPONIVEL",
          lote: {
            status: "DISPONIVEL",
            validade: { gt: new Date() }
          }
        },
        include: { lote: true },
        orderBy: [{ lote: { validade: "asc" } }],
      });

      for (const saldo of saldos) {
        if (restante <= 0) break;
        const consumir = Math.min(saldo.quantidadeDisponivel, restante);
        await tx.estoqueAtual.update({
          where: { id: saldo.id },
          data: {
            quantidadeDisponivel: { decrement: consumir },
            quantidadeReservada: { increment: consumir },
          },
        });
        await tx.movimentacaoEstoque.create({
          data: {
            produtoId: item.produtoId,
            loteId: saldo.loteId,
            tipo: "RESERVA",
            quantidade: consumir,
            pedidoVendaId: pedido.id,
            usuarioId: actor?.usuarioId,
            observacao: `${origem} - pedido ${pedido.numero}`,
          },
        });
        restante -= consumir;
      }

      if (restante > 0) {
        throw new Error(`Estoque insuficiente para o produto ${item.produtoId}.`);
      }
    }
  }

  private static async gerarContasReceber(tx: Prisma.TransactionClient, pedido: any) {
    const contaExistente = await tx.conta.findFirst({
      where: {
        pedidoVendaId: pedido.id,
        tipo: "RECEBER",
        status: { not: "CANCELADA" },
      },
    });
    if (contaExistente) return;

    const hoje = new Date();
    const formaPagamento = pedido.formaPagamento as FormaPagamento | null;

    if (formaPagamento === "PIX" || formaPagamento === "DINHEIRO" || formaPagamento === "CARTAO_DEBITO") {
      await tx.conta.create({
        data: {
          tipo: "RECEBER",
          descricao: `Pedido #${pedido.numero}`,
          valor: pedido.valorTotal,
          dataVencimento: hoje,
          dataPagamento: hoje,
          status: "PAGA",
          clienteId: pedido.clienteId,
          pedidoVendaId: pedido.id,
          observacao: `Pagamento a vista - ${formaPagamento}`,
        },
      });
      return;
    }

    const prazo = pedido.prazoPagamento ? parseInt(pedido.prazoPagamento, 10) || 30 : 30;
    const vencimento = new Date(hoje);
    vencimento.setDate(vencimento.getDate() + prazo);

    await tx.conta.create({
      data: {
        tipo: "RECEBER",
        descricao: `Pedido #${pedido.numero}`,
        valor: pedido.valorTotal,
        dataVencimento: vencimento,
        status: "ABERTA",
        clienteId: pedido.clienteId,
        pedidoVendaId: pedido.id,
        observacao: formaPagamento ? `${formaPagamento} - vencimento ${prazo} dias` : `A prazo - ${prazo} dias`,
      },
    });
  }

  static async criarPedido(
    data: {
      clienteId: number;
      vendedorId?: number;
      tipoPedido: TipoPedido;
      empresaFiscalId?: number;
      desconto?: number;
      observacao?: string;
      formaPagamento?: FormaPagamento;
      prazoPagamento?: string;
      itens: { produtoId: number; quantidade: number; precoUnitario: number; desconto?: number }[];
    },
    actor?: PedidoActor
  ) {
    this.assertPerfil(actor, [PerfilUsuario.VENDAS]);

    const valorItens = data.itens.reduce(
      (sum, item) => sum + item.quantidade * item.precoUnitario - (item.desconto || 0),
      0
    );

    const pedidoCriado = await prisma.$transaction(async (tx) => {
      const pedido = await tx.pedidoVenda.create({
        data: {
          clienteId: data.clienteId,
          vendedorId: data.vendedorId,
          tipoPedido: data.tipoPedido,
          empresaFiscalId: data.empresaFiscalId,
          status: StatusPedido.PEDIDO_CRIADO,
          desconto: data.desconto || 0,
          observacao: data.observacao,
          formaPagamento: data.formaPagamento,
          prazoPagamento: data.prazoPagamento,
          valorTotal: valorItens - (data.desconto || 0),
          itens: {
            create: data.itens.map((item) => ({
              produtoId: item.produtoId,
              quantidade: item.quantidade,
              precoUnitario: item.precoUnitario,
              desconto: item.desconto || 0,
              subtotal: item.quantidade * item.precoUnitario - (item.desconto || 0),
            })),
          },
        },
        include: { itens: true },
      });

      await this.registrarHistorico(
        tx,
        pedido.id,
        null,
        StatusPedido.PEDIDO_CRIADO,
        actor,
        "Pedido criado",
        "CRIACAO_PEDIDO"
      );
      return pedido;
    });

    await this.verificarEstoque(pedidoCriado.id, actor, { automatico: true });
    return pedidoCriado;
  }

  static async verificarEstoque(id: number, actor?: PedidoActor, opcoes?: { automatico?: boolean }) {
    if (!opcoes?.automatico) this.assertPerfil(actor, [PerfilUsuario.ESTOQUE]);

    const pedido = await prisma.pedidoVenda.findUnique({ where: { id }, include: { itens: true } });
    if (!pedido) throw new Error("Pedido nao encontrado.");

    let todosDisponiveis = true;
    let algumDisponivel = false;

    for (const item of pedido.itens) {
      const sum = await prisma.estoqueAtual.aggregate({
        where: {
          produtoId: item.produtoId,
          status: "DISPONIVEL",
          lote: {
            status: "DISPONIVEL",
            validade: { gt: new Date() }
          }
        },
        _sum: { quantidadeDisponivel: true },
      });
      const totalDisponivel = sum._sum.quantidadeDisponivel || 0;
      if (totalDisponivel > 0) algumDisponivel = true;
      if (totalDisponivel < item.quantidade) todosDisponiveis = false;
    }

    if (todosDisponiveis) {
      try {
        return await this.transicionarEmCadeia(
          id,
          [
            {
              status: StatusPedido.ESTOQUE_CONFIRMADO,
              observacao: opcoes?.automatico
                ? "Sistema confirmou disponibilidade e reservou produtos"
                : "Estoque confirmou disponibilidade e reservou produtos",
              tipoAcao: "ESTOQUE_CONFIRMADO",
            },
            {
              status: StatusPedido.AGUARDANDO_APROVACAO_FINANCEIRA,
              observacao: "Pedido enviado para pre-aprovacao financeira",
              tipoAcao: "ENVIO_FINANCEIRO",
            },
          ],
          actor,
          async (tx, ped) => this.reservarItens(tx, ped, actor, opcoes?.automatico ? "Reserva automatica" : "Reserva manual")
        );
      } catch (error: any) {
        await this.marcarEstoqueIndisponivel(id, actor, error.message);
        throw error;
      }
    }

    return this.transicionarEmCadeia(
      id,
      [
        {
          status: algumDisponivel ? StatusPedido.ESTOQUE_PARCIAL : StatusPedido.ESTOQUE_INDISPONIVEL,
          observacao: algumDisponivel
            ? "Estoque parcialmente disponivel - verificacao manual necessaria"
            : "Estoque indisponivel - verificacao manual necessaria",
          tipoAcao: "VERIFICACAO_ESTOQUE",
        },
      ],
      actor
    );
  }

  static async confirmarEstoque(id: number, actor?: PedidoActor) {
    this.assertPerfil(actor, [PerfilUsuario.ESTOQUE]);
    try {
      return await this.transicionarEmCadeia(
        id,
        [
          {
            status: StatusPedido.ESTOQUE_CONFIRMADO,
            observacao: "Estoque confirmado manualmente e produtos reservados",
            tipoAcao: "ESTOQUE_CONFIRMADO",
          },
          {
            status: StatusPedido.AGUARDANDO_APROVACAO_FINANCEIRA,
            observacao: "Pedido enviado para pre-aprovacao financeira",
            tipoAcao: "ENVIO_FINANCEIRO",
          },
        ],
        actor,
        async (tx, pedido) => this.reservarItens(tx, pedido, actor, "Reserva manual")
      );
    } catch (error: any) {
      await this.marcarEstoqueIndisponivel(id, actor, error.message);
      throw error;
    }
  }

  private static async marcarEstoqueIndisponivel(id: number, actor?: PedidoActor, erroMsg?: string) {
    const pedido = await this.carregarPedido(id);
    await prisma.$transaction(async (tx) => {
      await tx.pedidoVenda.update({
        where: { id },
        data: { status: StatusPedido.ESTOQUE_INDISPONIVEL }
      });
      await this.registrarHistorico(
        tx,
        id,
        pedido.status,
        StatusPedido.ESTOQUE_INDISPONIVEL,
        actor,
        `Estoque indisponível na reserva: ${erroMsg || "Lote indisponível"}`,
        "ESTOQUE_INDISPONIVEL"
      );
    });
  };

  static async aguardarFornecedor(id: number, actor?: PedidoActor, observacao?: string) {
    this.assertPerfil(actor, [PerfilUsuario.ESTOQUE]);
    return this.transicionarEmCadeia(
      id,
      [
        {
          status: StatusPedido.AGUARDANDO_FORNECEDOR,
          observacao: observacao || "Estoque aguardando fornecedor",
          tipoAcao: "AGUARDANDO_FORNECEDOR",
        },
      ],
      actor
    );
  }

  static async aprovarFinanceiro(id: number, actor?: PedidoActor) {
    this.assertPerfil(actor, [PerfilUsuario.FINANCEIRO]);
    const pedido = await this.carregarPedido(id);

    const passos: PassoStatus[] = [];
    if (pedido.status === StatusPedido.PAGAMENTO_PENDENTE || pedido.status === StatusPedido.CONDICAO_COMERCIAL_PENDENTE) {
      passos.push({
        status: StatusPedido.AGUARDANDO_APROVACAO_FINANCEIRA,
        observacao: "Retorno para analise financeira",
        tipoAcao: "RETORNO_ANALISE_FINANCEIRA",
      });
    }
    passos.push(
      {
        status: StatusPedido.APROVADO_FINANCEIRO,
        observacao: "Pre-aprovado pelo financeiro",
        tipoAcao: "PRE_APROVACAO_FINANCEIRA",
      },
      {
        status: StatusPedido.AGUARDANDO_CONFIRMACAO_CLIENTE,
        observacao: "Pedido enviado ao vendedor para confirmacao do cliente",
        tipoAcao: "ENVIO_CONFIRMACAO_CLIENTE",
      }
    );
    return this.transicionarEmCadeia(id, passos, actor);
  }

  static async reprovarFinanceiro(id: number, actor?: PedidoActor, observacao?: string) {
    this.assertPerfil(actor, [PerfilUsuario.FINANCEIRO]);
    return this.transicionarEmCadeia(
      id,
      [
        {
          status: StatusPedido.REPROVADO_FINANCEIRO,
          observacao: observacao || "Reprovado pelo financeiro",
          tipoAcao: "REPROVACAO_FINANCEIRA",
        },
      ],
      actor,
      async (tx, pedido) => this.cancelarReservas(tx, pedido, actor, "Cancelamento por reprovação financeira")
    );
  }

  static async marcarPagamentoPendente(id: number, actor?: PedidoActor, observacao?: string) {
    this.assertPerfil(actor, [PerfilUsuario.FINANCEIRO]);
    return this.transicionarEmCadeia(id, [
      {
        status: StatusPedido.PAGAMENTO_PENDENTE,
        observacao: observacao || "Pagamento pendente",
        tipoAcao: "PAGAMENTO_PENDENTE",
      },
    ], actor);
  }

  static async marcarCondicaoComercialPendente(id: number, actor?: PedidoActor, observacao?: string) {
    this.assertPerfil(actor, [PerfilUsuario.FINANCEIRO]);
    return this.transicionarEmCadeia(id, [
      {
        status: StatusPedido.CONDICAO_COMERCIAL_PENDENTE,
        observacao: observacao || "Condicao comercial pendente",
        tipoAcao: "CONDICAO_COMERCIAL_PENDENTE",
      },
    ], actor);
  }

  static async clienteConfirmou(id: number, actor?: PedidoActor) {
    this.assertPerfil(actor, [PerfilUsuario.VENDAS]);
    return this.transicionarEmCadeia(id, [
      {
        status: StatusPedido.CLIENTE_CONFIRMOU,
        observacao: "Cliente confirmou o pedido",
        tipoAcao: "CLIENTE_CONFIRMOU",
      },
      {
        status: StatusPedido.AGUARDANDO_FATURAMENTO,
        observacao: "Pedido enviado para faturamento ou autorizacao interna",
        tipoAcao: "ENVIO_FATURAMENTO",
      },
    ], actor);
  }

  static async clienteRecusou(id: number, actor?: PedidoActor, observacao?: string) {
    this.assertPerfil(actor, [PerfilUsuario.VENDAS]);
    return this.transicionarEmCadeia(
      id,
      [
        {
          status: StatusPedido.CANCELADO_PELO_CLIENTE,
          observacao: observacao || "Pedido cancelado pelo cliente",
          tipoAcao: "CLIENTE_RECUSOU",
        },
      ],
      actor,
      async (tx, pedido) => this.cancelarReservas(tx, pedido, actor, "Cancelamento - cliente recusou")
    );
  }

  static async pedidoEmRevisao(id: number, actor?: PedidoActor, observacao?: string) {
    const pedido = await this.carregarPedido(id);
    this.assertResponsavel(pedido.status, actor);
    return this.transicionarEmCadeia(
      id,
      [
        {
          status: StatusPedido.PEDIDO_EM_REVISAO,
          observacao: observacao || "Pedido enviado para revisao",
          tipoAcao: "PEDIDO_EM_REVISAO",
        },
      ],
      actor,
      async (tx, ped) => this.cancelarReservas(tx, ped, actor, "Cancelamento por revisao do pedido")
    );
  }

  static async reiniciarFluxoAposRevisao(id: number, actor?: PedidoActor) {
    this.assertPerfil(actor, [PerfilUsuario.VENDAS]);
    return this.transicionarEmCadeia(id, [
      {
        status: StatusPedido.PEDIDO_CRIADO,
        observacao: "Pedido revisado e reiniciado",
        tipoAcao: "REINICIO_FLUXO",
      },
    ], actor);
  }

  static async faturarPedido(
    id: number,
    actor?: PedidoActor,
    dadosFiscal?: DadosFaturamentoFiscal
  ) {
    this.assertPerfil(actor, [PerfilUsuario.FINANCEIRO]);
    const pedido = await this.carregarPedido(id);
    const formaPagamento = dadosFiscal?.formaPagamento !== undefined
      ? dadosFiscal.formaPagamento
      : pedido.formaPagamento;

    if (pedido.tipoPedido === "PEDIDO_INTERNO") {
      throw new Error("Pedido interno nao emite NF. Use autorizarPedidoInterno.");
    }
    if (!formaPagamento) {
      throw new Error("Forma de pagamento deve estar definida antes do faturamento.");
    }
    if (!dadosFiscal?.empresaFiscalId && !pedido.empresaFiscalId) {
      throw new Error("Empresa emissora DAC/Pulse deve ser definida no faturamento.");
    }

    const empresaFiscalId = dadosFiscal?.empresaFiscalId || pedido.empresaFiscalId;
    if (!dadosFiscal?.naturezaOperacaoId) {
      throw new Error("Selecione uma natureza de operacao fiscal configurada.");
    }
    const calculoTributario = await calculateOrderTaxes({
      pedidoVendaId: id,
      empresaFiscalId: empresaFiscalId!,
      naturezaOperacaoId: dadosFiscal.naturezaOperacaoId,
      cliente: dadosFiscal.cliente ? {
        estado: dadosFiscal.cliente.estado,
        contribuinteICMS: dadosFiscal.cliente.contribuinteICMS,
        consumidorFinal: dadosFiscal.cliente.consumidorFinal,
      } : undefined,
    });
    const clienteFiscalUpdate = buildClienteFiscalUpdate(dadosFiscal?.cliente);

    let documentoFiscalId: number | undefined;

    await prisma.$transaction(async (tx) => {
      const pedidoTx = await tx.pedidoVenda.findUnique({
        where: { id },
        include: { itens: true, movimentacoesEstoque: true },
      });
      if (!pedidoTx) throw new Error("Pedido nao encontrado.");

      await tx.pedidoVenda.update({
        where: { id },
        data: {
          empresaFiscalId,
          formaPagamento,
          prazoPagamento: dadosFiscal?.prazoPagamento !== undefined ? dadosFiscal.prazoPagamento : undefined,
          observacao: dadosFiscal?.observacao !== undefined ? dadosFiscal.observacao : undefined,
        },
      });

      if (clienteFiscalUpdate && Object.keys(clienteFiscalUpdate).length > 0) {
        await tx.cliente.update({
          where: { id: pedidoTx.clienteId },
          data: clienteFiscalUpdate,
        });
      }

      if (pedidoTx.status === StatusPedido.CLIENTE_CONFIRMOU) {
        await this.aplicarStatus(tx, pedidoTx, {
          status: StatusPedido.AGUARDANDO_FATURAMENTO,
          observacao: "Pedido encaminhado para faturamento",
          tipoAcao: "ENVIO_FATURAMENTO",
        }, actor);
      }

      const docFiscal = await tx.documentoFiscal.create({
        data: {
          tipo: TipoDocumentoFiscal.NFE_SAIDA,
          numero: dadosFiscal?.numero || `NF-${pedidoTx.numero}`,
          empresaFiscalId: empresaFiscalId!,
          naturezaOperacaoFiscalId: dadosFiscal.naturezaOperacaoId,
          clienteId: pedidoTx.clienteId,
          pedidoVendaId: id,
          status: StatusDocumentoFiscal.PENDENTE,
          dataEmissao: new Date(),
          calculoTributario: calculoTributario as unknown as Prisma.InputJsonValue,
        },
      });

      documentoFiscalId = docFiscal.id;

      await this.registrarHistorico(
        tx,
        id,
        pedidoTx.status,
        pedidoTx.status,
        actor,
        `Tentativa de emissao fiscal iniciada para documento ${docFiscal.id}`,
        "EMISSAO_NF_TENTATIVA"
      );
    });

    let fiscal: { autorizada: boolean };
    try {
      fiscal = await FiscalOrquestradorService.emitir(documentoFiscalId!, {
        naturezaOperacao: calculoTributario.natureza.nome,
        informacoesComplementares: [
          dadosFiscal?.informacoesComplementares || dadosFiscal?.observacao,
          ...calculoTributario.informacoesComplementares,
        ].filter(Boolean).join(" | "),
        calculoTributario,
      });
    } catch (err: any) {
      const pedidoAtual = await prisma.pedidoVenda.findUnique({ where: { id }, select: { status: true } });
      await prisma.historicoPedido.create({
        data: {
          pedidoVendaId: id,
          statusAnterior: pedidoAtual?.status || pedido.status,
          statusNovo: pedidoAtual?.status || pedido.status,
          usuarioId: actor?.usuarioId,
          setor: actor?.perfil || null,
          tipoAcao: "EMISSAO_NF_ERRO",
          observacao: `Erro na emissao fiscal do documento ${documentoFiscalId}: ${err.message || err}`,
        },
      });
      throw err;
    }

    if (!fiscal.autorizada) {
      const [docRejeitado, pedidoAtual] = await Promise.all([
        prisma.documentoFiscal.findUnique({
          where: { id: documentoFiscalId! },
          select: { codigoRejeicao: true, mensagemRejeicao: true, motivoRejeicao: true },
        }),
        prisma.pedidoVenda.findUnique({ where: { id }, select: { status: true } }),
      ]);
      const motivo = docRejeitado?.mensagemRejeicao || docRejeitado?.motivoRejeicao || "NF-e rejeitada sem motivo informado.";

      await prisma.historicoPedido.create({
        data: {
          pedidoVendaId: id,
          statusAnterior: pedidoAtual?.status || pedido.status,
          statusNovo: pedidoAtual?.status || pedido.status,
          usuarioId: actor?.usuarioId,
          setor: actor?.perfil || null,
          tipoAcao: "EMISSAO_NF_REJEITADA",
          observacao: `NF-e rejeitada${docRejeitado?.codigoRejeicao ? ` (${docRejeitado.codigoRejeicao})` : ""}: ${motivo}`,
        },
      });

      throw new Error(`NF-e rejeitada: ${motivo}`);
    }

    const resultado = await this.transicionarEmCadeia(
      id,
      [
        {
          status: StatusPedido.FATURADO,
          observacao: "Pedido faturado com NF autorizada",
          tipoAcao: "FATURAMENTO_NF",
        },
        {
          status: StatusPedido.AUTORIZADO_PARA_SEPARACAO,
          observacao: "Pedido liberado para separacao apos autorizacao fiscal",
          tipoAcao: "LIBERACAO_SEPARACAO",
        },
      ],
      actor,
      async (tx, ped) => {
        await this.gerarContasReceber(tx, ped);
      }
    );

    const docAutorizado = await prisma.documentoFiscal.findUnique({
      where: { id: documentoFiscalId! },
      select: { chaveAcesso: true },
    });

    await prisma.historicoPedido.create({
      data: {
        pedidoVendaId: id,
        statusAnterior: StatusPedido.AUTORIZADO_PARA_SEPARACAO,
        statusNovo: StatusPedido.AUTORIZADO_PARA_SEPARACAO,
        usuarioId: actor?.usuarioId,
        setor: actor?.perfil || null,
        tipoAcao: "EMISSAO_NF_AUTORIZADA",
        observacao: `NF autorizada${docAutorizado?.chaveAcesso ? ` - chave ${docAutorizado.chaveAcesso}` : ""}`,
      },
    });

    try {
      await enviarEmailFiscal(documentoFiscalId!);
    } catch (err: any) {
      console.error(`Erro no envio de e-mail fiscal do documento ${documentoFiscalId}:`, err.message || err);
    }

    return resultado;
  }

  static async autorizarPedidoInterno(id: number, actor?: PedidoActor) {
    this.assertPerfil(actor, [PerfilUsuario.FINANCEIRO]);
    const pedido = await this.carregarPedido(id);

    if (pedido.tipoPedido !== "PEDIDO_INTERNO") {
      throw new Error("Apenas pedidos internos podem ser autorizados.");
    }
    if (!pedido.formaPagamento) {
      throw new Error("Forma de pagamento deve estar definida antes da autorizacao.");
    }

    const passos: PassoStatus[] = [];
    if (pedido.status === StatusPedido.CLIENTE_CONFIRMOU) {
      passos.push({
        status: StatusPedido.AGUARDANDO_FATURAMENTO,
        observacao: "Pedido interno encaminhado para faturamento",
        tipoAcao: "ENVIO_FATURAMENTO",
      });
    }
    passos.push(
      {
        status: StatusPedido.PEDIDO_INTERNO_AUTORIZADO,
        observacao: "Pedido interno autorizado pelo financeiro",
        tipoAcao: "AUTORIZACAO_PEDIDO_INTERNO",
      },
      {
        status: StatusPedido.AUTORIZADO_PARA_SEPARACAO,
        observacao: "Pedido interno liberado para separacao",
        tipoAcao: "LIBERACAO_SEPARACAO",
      }
    );

    return this.transicionarEmCadeia(
      id,
      passos,
      actor,
      async (tx, ped) => this.gerarContasReceber(tx, ped)
    );
  }

  static async iniciarSeparacao(id: number, actor?: PedidoActor) {
    this.assertPerfil(actor, [PerfilUsuario.ESTOQUE]);
    const pedido = await this.carregarPedido(id);

    // Validar se algum lote das reservas está inválido (VENCIDO, BLOQUEADO, QUARENTENA)
    const reservas = await prisma.movimentacaoEstoque.findMany({
      where: {
        pedidoVendaId: id,
        tipo: "RESERVA",
      },
      include: {
        lote: {
          include: { produto: true }
        }
      }
    });

    for (const reserva of reservas) {
      if (reserva.lote) {
        const lote = reserva.lote;
        if (["VENCIDO", "BLOQUEADO", "QUARENTENA"].includes(lote.status)) {
          throw new Error(`Lote ${lote.numeroLote} do produto ${lote.produto.descricao} está ${lote.status} e não pode ser separado`);
        }
      }
    }

    const passos: PassoStatus[] = [];

    if (pedido.status === StatusPedido.FATURADO || pedido.status === StatusPedido.PEDIDO_INTERNO_AUTORIZADO) {
      passos.push({
        status: StatusPedido.AUTORIZADO_PARA_SEPARACAO,
        observacao: "Pedido liberado para separacao",
        tipoAcao: "LIBERACAO_SEPARACAO",
      });
    }

    passos.push({
      status: StatusPedido.EM_SEPARACAO,
      observacao: "Separacao iniciada pelo estoque",
      tipoAcao: "INICIO_SEPARACAO",
    });

    return this.transicionarEmCadeia(
      id,
      passos,
      actor,
      async (tx, ped) => {
        await tx.separacao.upsert({
          where: { pedidoVendaId: id },
          update: { status: "EM_ANDAMENTO" },
          create: {
            pedidoVendaId: id,
            status: "EM_ANDAMENTO",
            itens: {
              create: ped.itens.map((item: any) => ({
                produtoId: item.produtoId,
                quantidade: item.quantidade,
              })),
            },
          },
        });
      }
    );
  }

  static async finalizarSeparacao(id: number, actor?: PedidoActor) {
    this.assertPerfil(actor, [PerfilUsuario.ESTOQUE]);
    const pedido = await this.carregarPedido(id);

    // Validar se algum lote das reservas está inválido (VENCIDO, BLOQUEADO, QUARENTENA)
    const reservasVal = await prisma.movimentacaoEstoque.findMany({
      where: {
        pedidoVendaId: id,
        tipo: "RESERVA",
      },
      include: {
        lote: {
          include: { produto: true }
        }
      }
    });

    for (const reserva of reservasVal) {
      if (reserva.lote) {
        const lote = reserva.lote;
        if (["VENCIDO", "BLOQUEADO", "QUARENTENA"].includes(lote.status)) {
          throw new Error(`Lote ${lote.numeroLote} do produto ${lote.produto.descricao} está ${lote.status} e não pode ser separado`);
        }
      }
    }

    return this.transicionarEmCadeia(
      id,
      [
        {
          status: StatusPedido.SEPARADO,
          observacao: "Separacao conferida e estoque baixado",
          tipoAcao: "SEPARACAO_FINALIZADA",
        },
      ],
      actor,
      async (tx, pedido) => {
        const separacao = await tx.separacao.findUnique({ where: { pedidoVendaId: id } });
        if (separacao) {
          await tx.separacao.update({
            where: { pedidoVendaId: id },
            data: { status: "CONFERIDO" },
          });

          // Atualizar ItemSeparacao correspondente com o loteId da reserva
          const reservas = this.reservasPendentes(pedido);
          for (const reserva of reservas) {
            const itemSeparacaoExistente = await tx.itemSeparacao.findFirst({
              where: {
                separacaoId: separacao.id,
                produtoId: reserva.produtoId,
                loteId: null
              }
            });

            if (itemSeparacaoExistente) {
              await tx.itemSeparacao.update({
                where: { id: itemSeparacaoExistente.id },
                data: {
                  loteId: reserva.loteId,
                  quantidade: reserva.quantidade,
                  conferido: true
                }
              });
            } else {
              await tx.itemSeparacao.create({
                data: {
                  separacaoId: separacao.id,
                  produtoId: reserva.produtoId,
                  loteId: reserva.loteId,
                  quantidade: reserva.quantidade,
                  conferido: true
                }
              });
            }
          }
        }

        const reservas = this.reservasPendentes(pedido);
        if (!reservas.length) {
          throw new Error("Nao ha reserva de estoque para baixar este pedido.");
        }

        const documentoFiscal = pedido.tipoPedido === "PEDIDO_NORMAL"
          ? await tx.documentoFiscal.findFirst({
              where: { pedidoVendaId: id, status: "AUTORIZADA" },
              orderBy: { createdAt: "desc" },
            })
          : null;

        if (pedido.tipoPedido === "PEDIDO_NORMAL" && (!documentoFiscal || !pedido.empresaFiscalId)) {
          throw new Error("Pedido com NF precisa de documento fiscal e empresa emissora antes da baixa.");
        }

        for (const reserva of reservas) {
          const estoque = await tx.estoqueAtual.findFirst({
            where: {
              produtoId: reserva.produtoId,
              loteId: reserva.loteId,
            },
          });
          if (!estoque || estoque.quantidadeReservada < reserva.quantidade) {
            throw new Error(`Reserva insuficiente para o produto ${reserva.produtoId}.`);
          }

          await tx.estoqueAtual.update({
            where: { id: estoque.id },
            data: { quantidadeReservada: { decrement: reserva.quantidade } },
          });

          const item = pedido.itens.find((i: any) => i.produtoId === reserva.produtoId);
          const proporcao = item?.quantidade ? reserva.quantidade / item.quantidade : 1;
          const valorTotal = item?.subtotal ? item.subtotal * proporcao : 0;

          const movEstoque = await tx.movimentacaoEstoque.create({
            data: {
              produtoId: reserva.produtoId,
              loteId: reserva.loteId,
              tipo: "SAIDA",
              quantidade: reserva.quantidade,
              pedidoVendaId: id,
              usuarioId: actor?.usuarioId,
              empresaFiscalId: pedido.tipoPedido === "PEDIDO_NORMAL" ? pedido.empresaFiscalId : null,
              destino: `Cliente: ${pedido.cliente.razaoSocial}`,
              observacao:
                pedido.tipoPedido === "PEDIDO_NORMAL"
                  ? `Saida operacional com NF - pedido ${pedido.numero}`
                  : `Saida operacional interna - pedido ${pedido.numero}`,
            },
          });

          if (pedido.tipoPedido === "PEDIDO_NORMAL" && documentoFiscal && pedido.empresaFiscalId) {
            await tx.movimentacaoFiscal.create({
              data: {
                movimentacaoEstoqueId: movEstoque.id,
                pedidoVendaId: id,
                clienteId: pedido.clienteId,
                empresaFiscalId: pedido.empresaFiscalId,
                documentoFiscalId: documentoFiscal.id,
                produtoId: reserva.produtoId,
                loteId: reserva.loteId,
                quantidade: reserva.quantidade,
                valorTotal,
                status: "AUTORIZADA",
                dataEmissao: new Date(),
              },
            });
          }
        }
      }
    );
  }

  static async despacharPedido(id: number, actor?: PedidoActor) {
    this.assertPerfil(actor, [PerfilUsuario.ESTOQUE]);
    return this.transicionarEmCadeia(
      id,
      [
        {
          status: StatusPedido.DESPACHADO,
          observacao: "Pedido despachado pelo estoque",
          tipoAcao: "PEDIDO_DESPACHADO",
        },
        {
          status: StatusPedido.FINALIZADO,
          observacao: "Pedido finalizado automaticamente apos despacho",
          tipoAcao: "FINALIZACAO_AUTOMATICA",
        },
      ],
      actor,
      async (tx) => {
        const separacao = await tx.separacao.findUnique({ where: { pedidoVendaId: id } });
        if (separacao) {
          await tx.separacao.update({
            where: { pedidoVendaId: id },
            data: { status: "DESPACHADO" },
          });
        }
      }
    );
  }

  static async finalizarPedido(id: number, actor?: PedidoActor) {
    this.assertPerfil(actor, [PerfilUsuario.ESTOQUE]);
    return this.transicionarEmCadeia(id, [
      {
        status: StatusPedido.FINALIZADO,
        observacao: "Pedido finalizado",
        tipoAcao: "FINALIZACAO_PEDIDO",
      },
    ], actor);
  }

  static async cancelarPedido(id: number, actor?: PedidoActor, observacao?: string) {
    const pedido = await this.carregarPedido(id);
    this.assertResponsavel(pedido.status, actor);
    return this.transicionarEmCadeia(
      id,
      [
        {
          status: StatusPedido.CANCELADO,
          observacao: observacao || "Pedido cancelado",
          tipoAcao: "CANCELAMENTO_PEDIDO",
        },
      ],
      actor,
      async (tx, ped) => this.cancelarReservas(tx, ped, actor, "Cancelamento de pedido")
    );
  }

  static async atualizarDadosPedido(
    id: number,
    data: {
      observacao?: string | null;
      formaPagamento?: FormaPagamento | null;
      prazoPagamento?: string | null;
      desconto?: number;
    },
    actor?: PedidoActor
  ) {
    const pedido = await this.carregarPedido(id);
    this.assertEditavel(pedido.status);

    const podeEditarFinanceiro =
      data.formaPagamento !== undefined ||
      data.prazoPagamento !== undefined ||
      data.desconto !== undefined;

    if (podeEditarFinanceiro) this.assertPerfil(actor, [PerfilUsuario.FINANCEIRO]);
    else this.assertResponsavel(pedido.status, actor);

    const updateData: Prisma.PedidoVendaUpdateInput = {
      observacao: data.observacao !== undefined ? data.observacao : undefined,
      formaPagamento: data.formaPagamento !== undefined ? data.formaPagamento : undefined,
      prazoPagamento: data.prazoPagamento !== undefined ? data.prazoPagamento : undefined,
    };

    if (data.desconto !== undefined) {
      const subtotalItens = pedido.itens.reduce((sum: number, item: any) => sum + item.subtotal, 0);
      updateData.desconto = data.desconto;
      updateData.valorTotal = subtotalItens - data.desconto;
    }

    return prisma.$transaction(async (tx) => {
      const atualizado = await tx.pedidoVenda.update({
        where: { id },
        data: updateData,
      });

      await this.registrarHistorico(
        tx,
        id,
        pedido.status,
        pedido.status,
        actor,
        "Dados do pedido atualizados",
        "EDICAO_PEDIDO"
      );

      return atualizado;
    });
  }
}
