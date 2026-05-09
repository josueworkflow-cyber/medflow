"use client";

import { useEffect, useState } from "react";
import {
  Clock,
  Hash,
  Package,
  Receipt,
  User,
  MapPin,
  Building2,
  CreditCard,
  TrendingUp,
  X,
  Calendar,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const statusLabel: Record<string, string> = {
  PEDIDO_CRIADO: "Criado",
  AGUARDANDO_ESTOQUE: "Aguardando Estoque",
  ESTOQUE_CONFIRMADO: "Estoque OK",
  ESTOQUE_PARCIAL: "Parcial",
  ESTOQUE_INDISPONIVEL: "Indisponível",
  AGUARDANDO_FORNECEDOR: "Aguardando Fornecedor",
  AGUARDANDO_APROVACAO_FINANCEIRA: "Aguard. Aprovação",
  APROVADO_FINANCEIRO: "Pré-aprovado",
  REPROVADO_FINANCEIRO: "Reprovado",
  PAGAMENTO_PENDENTE: "Pagamento Pendente",
  CONDICAO_COMERCIAL_PENDENTE: "Cond. Pendente",
  AGUARDANDO_CONFIRMACAO_CLIENTE: "Aguardando Cliente",
  CLIENTE_CONFIRMOU: "Cliente Confirmou",
  PEDIDO_EM_REVISAO: "Em Revisão",
  AGUARDANDO_FATURAMENTO: "Aguard. Faturamento",
  FATURADO: "Faturado",
  PEDIDO_INTERNO_AUTORIZADO: "Interno Autorizado",
  AUTORIZADO_PARA_SEPARACAO: "Separar",
  EM_SEPARACAO: "Em Separação",
  SEPARADO: "Separado",
  DESPACHADO: "Despachado",
  FINALIZADO: "Finalizado",
  CANCELADO: "Cancelado",
  CANCELADO_PELO_CLIENTE: "Canc. Cliente",
};

const statusColor: Record<string, string> = {
  PEDIDO_CRIADO: "bg-slate-100 text-slate-700 border-slate-200",
  AGUARDANDO_ESTOQUE: "bg-blue-50 text-blue-700 border-blue-200",
  ESTOQUE_CONFIRMADO: "bg-emerald-50 text-emerald-700 border-emerald-200",
  ESTOQUE_PARCIAL: "bg-amber-50 text-amber-700 border-amber-200",
  ESTOQUE_INDISPONIVEL: "bg-red-50 text-red-700 border-red-200",
  AGUARDANDO_FORNECEDOR: "bg-orange-50 text-orange-700 border-orange-200",
  AGUARDANDO_APROVACAO_FINANCEIRA: "bg-amber-50 text-amber-700 border-amber-200",
  APROVADO_FINANCEIRO: "bg-emerald-50 text-emerald-700 border-emerald-200",
  REPROVADO_FINANCEIRO: "bg-red-50 text-red-700 border-red-200",
  PAGAMENTO_PENDENTE: "bg-amber-50 text-amber-700 border-amber-200",
  CONDICAO_COMERCIAL_PENDENTE: "bg-amber-50 text-amber-700 border-amber-200",
  AGUARDANDO_CONFIRMACAO_CLIENTE: "bg-violet-50 text-violet-700 border-violet-200",
  CLIENTE_CONFIRMOU: "bg-emerald-50 text-emerald-700 border-emerald-200",
  PEDIDO_EM_REVISAO: "bg-slate-100 text-slate-600 border-slate-200",
  AGUARDANDO_FATURAMENTO: "bg-indigo-50 text-indigo-700 border-indigo-200",
  FATURADO: "bg-emerald-50 text-emerald-700 border-emerald-200",
  PEDIDO_INTERNO_AUTORIZADO: "bg-emerald-50 text-emerald-700 border-emerald-200",
  AUTORIZADO_PARA_SEPARACAO: "bg-indigo-50 text-indigo-700 border-indigo-200",
  EM_SEPARACAO: "bg-blue-50 text-blue-700 border-blue-200",
  SEPARADO: "bg-teal-50 text-teal-700 border-teal-200",
  DESPACHADO: "bg-teal-50 text-teal-700 border-teal-200",
  FINALIZADO: "bg-slate-100 text-slate-600 border-slate-200",
  CANCELADO: "bg-red-50 text-red-700 border-red-200",
  CANCELADO_PELO_CLIENTE: "bg-red-50 text-red-700 border-red-200",
};

const timelineDot: Record<string, string> = {
  PEDIDO_CRIADO: "bg-slate-400 ring-slate-200",
  AGUARDANDO_ESTOQUE: "bg-blue-400 ring-blue-200",
  ESTOQUE_CONFIRMADO: "bg-emerald-500 ring-emerald-200",
  ESTOQUE_PARCIAL: "bg-amber-400 ring-amber-200",
  ESTOQUE_INDISPONIVEL: "bg-red-400 ring-red-200",
  AGUARDANDO_FORNECEDOR: "bg-orange-400 ring-orange-200",
  AGUARDANDO_APROVACAO_FINANCEIRA: "bg-amber-400 ring-amber-200",
  APROVADO_FINANCEIRO: "bg-emerald-500 ring-emerald-200",
  REPROVADO_FINANCEIRO: "bg-red-400 ring-red-200",
  PAGAMENTO_PENDENTE: "bg-amber-400 ring-amber-200",
  CONDICAO_COMERCIAL_PENDENTE: "bg-amber-400 ring-amber-200",
  AGUARDANDO_CONFIRMACAO_CLIENTE: "bg-violet-400 ring-violet-200",
  CLIENTE_CONFIRMOU: "bg-emerald-500 ring-emerald-200",
  PEDIDO_EM_REVISAO: "bg-slate-300 ring-slate-200",
  AGUARDANDO_FATURAMENTO: "bg-indigo-400 ring-indigo-200",
  FATURADO: "bg-emerald-500 ring-emerald-200",
  PEDIDO_INTERNO_AUTORIZADO: "bg-emerald-500 ring-emerald-200",
  AUTORIZADO_PARA_SEPARACAO: "bg-indigo-400 ring-indigo-200",
  EM_SEPARACAO: "bg-blue-400 ring-blue-200",
  SEPARADO: "bg-teal-400 ring-teal-200",
  DESPACHADO: "bg-teal-400 ring-teal-200",
  FINALIZADO: "bg-slate-600 ring-slate-300",
  CANCELADO: "bg-red-500 ring-red-200",
  CANCELADO_PELO_CLIENTE: "bg-red-500 ring-red-200",
};

const formaLabel: Record<string, string> = {
  PIX: "PIX",
  BOLETO: "Boleto",
  CARTAO_CREDITO: "Cartão de Crédito",
  CARTAO_DEBITO: "Cartão de Débito",
  DINHEIRO: "Dinheiro",
  TRANSFERENCIA: "Transferência",
  A_PRAZO: "A Prazo",
  CHEQUE: "Cheque",
};

type PedidoDetail = {
  id: number;
  numero: string;
  status: string;
  tipoPedido: string;
  valorTotal: number;
  desconto: number;
  observacao: string | null;
  formaPagamento: string | null;
  prazoPagamento: string | null;
  createdAt: string;
  updatedAt: string;
  cliente: {
    razaoSocial: string;
    nomeFantasia: string | null;
    cnpjCpf: string | null;
    email: string | null;
    telefone: string | null;
    cidade: string | null;
    estado: string | null;
    endereco: string | null;
    cep: string | null;
  };
  vendedor: { nome: string } | null;
  empresaFiscal: {
    razaoSocial: string;
    nomeFantasia: string | null;
    cnpj: string | null;
    inscricaoEstadual: string | null;
    regimeTributario: string | null;
  } | null;
  documentosFiscais: {
    id: number;
    tipo: string;
    numero: string;
    status: string;
    dataEmissao: string;
  }[];
  itens: {
    id: number;
    quantidade: number;
    precoUnitario: number;
    desconto: number;
    subtotal: number;
    produto: {
      descricao: string;
      codigoInterno: string | null;
    };
  }[];
  historico: {
    id: number;
    statusAnterior: string | null;
    statusNovo: string;
    observacao: string | null;
    tipoAcao: string | null;
    createdAt: string;
    usuario: { nome: string } | null;
  }[];
};

function formatDate(d: string) {
  return new Date(d).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateShort(d: string) {
  return new Date(d).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function InfoBadge({ icon: Icon, label, value, accent }: { icon: React.ElementType; label: string; value: string; accent?: string }) {
  return (
    <div className="flex items-start gap-2.5 p-3 bg-white rounded-lg border border-slate-100 shadow-sm">
      <div className={cn("p-1.5 rounded-md shrink-0", accent || "bg-slate-100")}>
        <Icon className={cn("h-3.5 w-3.5", accent ? "text-white" : "text-slate-500")} />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{label}</p>
        <p className="text-sm font-medium text-slate-800 truncate">{value}</p>
      </div>
    </div>
  );
}

export default function PedidoDetailSheet({
  pedidoId,
  open,
  onOpenChange,
}: {
  pedidoId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [pedido, setPedido] = useState<PedidoDetail | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !pedidoId) return;
    setLoading(true);
    fetch(`/api/vendas/${pedidoId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setPedido(data);
      })
      .catch(() => setPedido(null))
      .finally(() => setLoading(false));
  }, [open, pedidoId]);

  const totalItens = pedido?.itens.reduce((sum, i) => sum + i.subtotal, 0) || 0;

  const periodo = pedido
    ? `${new Date(pedido.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })} — ${new Date(pedido.updatedAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}`
    : "";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl p-0 overflow-y-auto" showCloseButton={false}>
        <SheetTitle className="sr-only">
          {pedido ? `Pedido #${pedido.numero.slice(-8)} — ${pedido.cliente.razaoSocial}` : "Detalhes do Pedido"}
        </SheetTitle>
        {loading ? (
          <div className="p-6 space-y-6">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-6 w-32" />
            <div className="grid grid-cols-2 gap-3">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-36 w-full" />
          </div>
        ) : pedido ? (
          <div className="flex flex-col min-h-full">
            {/* ── HERO HEADER ── */}
            <div className="relative bg-gradient-to-br from-slate-800 via-slate-700 to-slate-900 px-6 pt-6 pb-8 text-white overflow-hidden">
              <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/4" />
              <div className="absolute bottom-0 left-1/2 w-32 h-32 bg-white/5 rounded-full translate-y-1/2" />

              <button
                onClick={() => onOpenChange(false)}
                className="absolute top-4 right-4 p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors z-10"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-3">
                  <span className="font-mono text-xs font-bold text-white/50 tracking-wider">
                    #{pedido.numero.slice(-8)}
                  </span>
                  <Badge
                    className={cn(
                      "text-[9px] border-0 backdrop-blur-sm",
                      pedido.tipoPedido === "PEDIDO_NORMAL"
                        ? "bg-blue-500/20 text-blue-200"
                        : "bg-orange-500/20 text-orange-200"
                    )}
                  >
                    {pedido.tipoPedido === "PEDIDO_NORMAL" ? "COM NF" : "INTERNO"}
                  </Badge>
                  <Badge className="text-[9px] bg-white/10 text-white/80 border-0 backdrop-blur-sm">
                    {statusLabel[pedido.status] || pedido.status}
                  </Badge>
                </div>

                <h2 className="text-xl font-bold tracking-tight mb-1">{pedido.cliente.razaoSocial}</h2>
                {pedido.cliente.nomeFantasia && (
                  <p className="text-sm text-white/50 mb-3">{pedido.cliente.nomeFantasia}</p>
                )}

                <div className="flex items-baseline gap-3">
                  <div className="flex items-baseline gap-1">
                    <span className="text-xs text-white/40">R$</span>
                    <span className="text-2xl font-bold tracking-tight">
                      {pedido.valorTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  {pedido.desconto > 0 && (
                    <Badge className="text-[10px] bg-red-500/20 text-red-200 border-0">
                      -R$ {pedido.desconto.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* ── INFO CARDS ── */}
            <div className="px-6 -mt-4 relative z-10">
              <div className="grid grid-cols-2 gap-2.5">
                <InfoBadge
                  icon={User}
                  label="Vendedor"
                  value={pedido.vendedor?.nome || "Sistema"}
                  accent="bg-blue-500"
                />
                <InfoBadge
                  icon={Calendar}
                  label="Período"
                  value={periodo}
                  accent="bg-slate-500"
                />
                {pedido.formaPagamento && (
                  <InfoBadge
                    icon={CreditCard}
                    label="Forma de Pagamento"
                    value={`${formaLabel[pedido.formaPagamento] || pedido.formaPagamento}${pedido.prazoPagamento ? ` · ${pedido.prazoPagamento} dias` : ""}`}
                    accent="bg-emerald-500"
                  />
                )}
                {pedido.empresaFiscal && (
                  <InfoBadge
                    icon={Building2}
                    label="Emissor NF"
                    value={pedido.empresaFiscal.nomeFantasia || pedido.empresaFiscal.razaoSocial}
                    accent="bg-indigo-500"
                  />
                )}
              </div>
            </div>

            {/* ── CLIENTE ── */}
            <div className="px-6 mt-5">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2.5">Cliente</p>
              <div className="bg-slate-50 rounded-xl p-3.5 text-xs space-y-1.5">
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-slate-600">
                  {pedido.cliente.cnpjCpf && <span className="font-mono">CNPJ/CPF: {pedido.cliente.cnpjCpf}</span>}
                  {pedido.cliente.email && <span>{pedido.cliente.email}</span>}
                  {pedido.cliente.telefone && <span>{pedido.cliente.telefone}</span>}
                </div>
                {(pedido.cliente.cidade || pedido.cliente.estado) && (
                  <div className="flex items-center gap-1 text-slate-400">
                    <MapPin className="h-3 w-3" />
                    {[pedido.cliente.cidade, pedido.cliente.estado].filter(Boolean).join(" — ")}
                  </div>
                )}
              </div>
            </div>

            {/* ── OBSERVACAO ── */}
            {pedido.observacao && (
              <div className="px-6 mt-4">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2.5">Observações</p>
                <div className="bg-amber-50/50 border border-amber-100 rounded-xl p-3 text-xs text-amber-800 italic leading-relaxed">
                  {pedido.observacao}
                </div>
              </div>
            )}

            {/* ── ITENS ── */}
            <div className="px-6 mt-5">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2.5">
                Itens do Pedido
                <span className="font-normal text-slate-300 ml-1">· {pedido.itens.length} itens</span>
              </p>
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="text-left py-2.5 px-3 font-semibold text-slate-500">Produto</th>
                      <th className="text-center py-2.5 px-2 font-semibold text-slate-500 w-14">Qtd</th>
                      <th className="text-right py-2.5 px-2 font-semibold text-slate-500">Unitário</th>
                      <th className="text-right py-2.5 px-3 font-semibold text-slate-500">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pedido.itens.map((item) => (
                      <tr key={item.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors">
                        <td className="py-2.5 px-3">
                          <p className="font-medium text-slate-800">{item.produto.descricao}</p>
                          {item.produto.codigoInterno && (
                            <p className="text-[10px] text-slate-400 mt-0.5 font-mono">{item.produto.codigoInterno}</p>
                          )}
                        </td>
                        <td className="py-2.5 px-2 text-center text-slate-600 font-medium">{item.quantidade}</td>
                        <td className="py-2.5 px-2 text-right text-slate-600 font-mono text-[11px]">
                          {item.precoUnitario.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-2.5 px-3 text-right font-semibold text-slate-800 font-mono text-[11px]">
                          {item.subtotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gradient-to-r from-slate-50 to-emerald-50/30">
                      <td colSpan={3} className="py-3 px-3 text-right">
                        <div className="flex flex-col items-end gap-0.5">
                          {pedido.desconto > 0 && (
                            <span className="text-red-500 text-[11px] font-medium">
                              Desconto -R$ {pedido.desconto.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                            </span>
                          )}
                          <span className="text-xs text-slate-500">
                            Subtotal R$ {totalItens.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <span className="text-sm font-bold text-emerald-600 font-mono">
                          {pedido.valorTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </span>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* ── HISTÓRICO ── */}
            <div className="px-6 mt-5 mb-6">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2.5">
                Histórico de Status
                <span className="font-normal text-slate-300 ml-1">· {pedido.historico.length} eventos</span>
              </p>

              <div className="relative pl-6">
                <div className="absolute left-[9px] top-1 bottom-1 w-px bg-slate-200" />
                <div className="space-y-2.5">
                  {pedido.historico.map((h, i) => {
                    const isLast = i === pedido.historico.length - 1;
                    return (
                      <div key={h.id} className="relative">
                        <div
                          className={cn(
                            "absolute -left-[23px] top-1 h-[11px] w-[11px] rounded-full border-2 border-white ring-2",
                            isLast
                              ? (timelineDot[h.statusNovo] || "bg-slate-400 ring-slate-200") + " scale-110"
                              : "bg-slate-300 ring-slate-200"
                          )}
                        />
                        <div className="bg-white rounded-lg border border-slate-100 p-2.5 shadow-sm">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <Badge
                              variant="outline"
                              className={cn("text-[9px] h-4 px-1.5 border", statusColor[h.statusNovo] || "bg-slate-50 text-slate-600")}
                            >
                              {statusLabel[h.statusNovo] || h.statusNovo}
                            </Badge>
                            {h.usuario && (
                              <span className="text-[10px] text-slate-400 flex items-center gap-1">
                                <User className="h-2.5 w-2.5" />
                                {h.usuario.nome}
                              </span>
                            )}
                            <span className="text-[10px] text-slate-400 ml-auto">{formatDateShort(h.createdAt)}</span>
                          </div>
                          {h.observacao && (
                            <p className="text-[11px] text-slate-500 leading-relaxed">{h.observacao}</p>
                          )}
                          {h.statusAnterior && (
                            <div className="flex items-center gap-1.5 mt-1 text-[10px] text-slate-400">
                              <span className={cn("px-1 py-0.5 rounded text-[9px]", statusColor[h.statusAnterior])}>
                                {statusLabel[h.statusAnterior] || h.statusAnterior}
                              </span>
                              <span>→</span>
                              <span className={cn("px-1 py-0.5 rounded text-[9px]", statusColor[h.statusNovo])}>
                                {statusLabel[h.statusNovo] || h.statusNovo}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
            <Hash className="h-10 w-10 opacity-20" />
            <p className="text-sm font-medium">Pedido não encontrado</p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
