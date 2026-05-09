"use client";

import { useState, useCallback } from "react";
import useSWR from "swr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import FaturarConfirmModal from "@/components/FaturarConfirmModal";
import {
  DollarSign, CheckCircle2, XCircle, FileText, Receipt,
  AlertTriangle, Clock, User, Save, Edit2, Eye,
  Send, Filter, RotateCcw, Package, ShoppingCart
} from "lucide-react";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const formaLabel: Record<string, string> = {
  PIX: "PIX", BOLETO: "Boleto", CARTAO_CREDITO: "Cartao de Credito",
  CARTAO_DEBITO: "Cartao de Debito", DINHEIRO: "Dinheiro",
  TRANSFERENCIA: "Transferencia", A_PRAZO: "A Prazo", CHEQUE: "Cheque",
};

const filtros = [
  { value: "pre_aprovacao", label: "Aguardando pre-aprovacao" },
  { value: "pre_aprovados", label: "Pre-aprovados" },
  { value: "cliente_confirmou", label: "Cliente confirmou" },
  { value: "faturamento", label: "Aguardando faturamento" },
  { value: "pendente_interno", label: "Internos ag. autorizacao" },
  { value: "faturados", label: "Faturados" },
  { value: "liberados", label: "Liberados para separacao" },
  { value: "revisao", label: "Em revisao" },
  { value: "todos", label: "Todos" },
];

const statusLabel: Record<string, string> = {
  AGUARDANDO_APROVACAO_FINANCEIRA: "Ag. Pre-aprovacao",
  PAGAMENTO_PENDENTE: "Pagamento Pendente",
  CONDICAO_COMERCIAL_PENDENTE: "Condicao Pendente",
  APROVADO_FINANCEIRO: "Pre-aprovado",
  AGUARDANDO_CONFIRMACAO_CLIENTE: "Ag. Cliente",
  CLIENTE_CONFIRMOU: "Cliente Confirmou",
  AGUARDANDO_FATURAMENTO: "Ag. Faturamento",
  FATURADO: "Faturado",
  PEDIDO_INTERNO_AUTORIZADO: "Interno Autorizado",
  AUTORIZADO_PARA_SEPARACAO: "Lib. Separacao",
  EM_SEPARACAO: "Em Separacao",
  SEPARADO: "Separado",
  DESPACHADO: "Despachado",
  FINALIZADO: "Finalizado",
  REPROVADO_FINANCEIRO: "Reprovado",
  PEDIDO_EM_REVISAO: "Em Revisao",
};

const statusBadgeColor: Record<string, string> = {
  AGUARDANDO_APROVACAO_FINANCEIRA: "bg-amber-100 text-amber-700",
  PAGAMENTO_PENDENTE: "bg-orange-100 text-orange-700",
  CONDICAO_COMERCIAL_PENDENTE: "bg-orange-100 text-orange-700",
  APROVADO_FINANCEIRO: "bg-emerald-100 text-emerald-700",
  AGUARDANDO_CONFIRMACAO_CLIENTE: "bg-blue-100 text-blue-700",
  CLIENTE_CONFIRMOU: "bg-green-100 text-green-700",
  AGUARDANDO_FATURAMENTO: "bg-purple-100 text-purple-700",
  FATURADO: "bg-indigo-100 text-indigo-700",
  PEDIDO_INTERNO_AUTORIZADO: "bg-teal-100 text-teal-700",
  AUTORIZADO_PARA_SEPARACAO: "bg-sky-100 text-sky-700",
  FINALIZADO: "bg-slate-100 text-slate-500",
  REPROVADO_FINANCEIRO: "bg-red-100 text-red-700",
  PEDIDO_EM_REVISAO: "bg-yellow-100 text-yellow-700",
};

export default function FinanceiroPedidosPage() {
  const [filtro, setFiltro] = useState("pre_aprovacao");
  const { data, isLoading, mutate } = useSWR(`/api/financeiro/pedidos?filtro=${filtro}`, fetcher, { refreshInterval: 30000 });
  const [motivoReprovar, setMotivoReprovar] = useState<Record<number, string>>({});
  const [empresaFaturar, setEmpresaFaturar] = useState<Record<number, string>>({});
  const [edicao, setEdicao] = useState<Record<number, any>>({});
  const [editando, setEditando] = useState<number | null>(null);
  const [modalFaturar, setModalFaturar] = useState(false);
  const [pedidoFaturando, setPedidoFaturando] = useState<number | null>(null);
  const [empresaFaturarAtual, setEmpresaFaturarAtual] = useState<string>("");
  const [faturando, setFaturando] = useState(false);
  const [enviandoRevisao, setEnviandoRevisao] = useState<Record<number, boolean>>({});

  const pedidos = data?.pedidos || [];
  const historicoClientes = data?.historicoClientes || {};
  const empresas = data?.empresas || [];

  function handleEdit(pedidoId: number, field: string, value: any) {
    setEdicao((prev) => ({ ...prev, [pedidoId]: { ...(prev[pedidoId] || {}), [field]: value } }));
  }

  async function salvarEdicao(pedidoId: number) {
    const dados = edicao[pedidoId];
    if (!dados) { setEditando(null); return; }
    try {
      const res = await fetch(`/api/vendas/${pedidoId}`, {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(dados),
      });
      if (!res.ok) throw new Error("Erro");
      toast.success("Pedido atualizado!");
      setEditando(null);
      mutate();
    } catch { toast.error("Falha ao atualizar pedido"); }
  }

  async function transicionar(pedidoId: number, acao: string, dados?: any) {
    try {
      const res = await fetch(`/api/vendas/${pedidoId}/transicao`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ acao, dados }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      toast.success("Pedido atualizado!");
      mutate();
    } catch (err: any) { toast.error(err.message); }
  }

  async function enviarRevisao(pedidoId: number) {
    setEnviandoRevisao((prev) => ({ ...prev, [pedidoId]: true }));
    try {
      const res = await fetch(`/api/vendas/${pedidoId}/transicao`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ acao: "pedido_em_revisao", dados: { observacao: "Enviado para revisao pelo financeiro" } }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      toast.success("Pedido enviado para revisao!");
      mutate();
    } catch (err: any) { toast.error(err.message); }
    finally { setEnviandoRevisao((prev) => ({ ...prev, [pedidoId]: false })); }
  }

  function HistoricoCliente({ clienteId }: { clienteId: number }) {
    const h = historicoClientes[clienteId];
    if (!h) return null;
    return (
      <div className="flex items-center gap-3 mt-2 px-3 py-2 bg-slate-50 rounded-lg text-[10px]">
        <span className="text-slate-500">{h.totalCompras} compras</span>
        <span className="text-blue-600">{h.contasAbertas} abertas (R$ {h.valorAberto.toLocaleString("pt-BR", { minimumFractionDigits: 2 })})</span>
        {h.inadimplencias > 0 && (
          <span className="text-red-600 font-semibold flex items-center gap-0.5">
            <AlertTriangle className="h-2.5 w-2.5" /> {h.inadimplencias} vencidas (R$ {h.valorInadimplente.toLocaleString("pt-BR", { minimumFractionDigits: 2 })})
          </span>
        )}
      </div>
    );
  }

  const showPreAprovacao = ["pre_aprovacao", "pre_aprovados", "todos"].includes(filtro);
  const showFaturamento = ["faturamento", "cliente_confirmou", "pendente_interno", "revisao", "todos"].includes(filtro);
  const showFinalizados = ["faturados", "liberados", "todos"].includes(filtro);

  const preAprovacao = pedidos.filter((p: any) =>
    ["AGUARDANDO_APROVACAO_FINANCEIRA", "PAGAMENTO_PENDENTE", "CONDICAO_COMERCIAL_PENDENTE", "APROVADO_FINANCEIRO", "AGUARDANDO_CONFIRMACAO_CLIENTE"].includes(p.status));
  const faturamento = pedidos.filter((p: any) =>
    ["CLIENTE_CONFIRMOU", "AGUARDANDO_FATURAMENTO", "REPROVADO_FINANCEIRO", "PEDIDO_EM_REVISAO"].includes(p.status));
  const finalizados = pedidos.filter((p: any) =>
    ["FATURADO", "PEDIDO_INTERNO_AUTORIZADO", "AUTORIZADO_PARA_SEPARACAO", "EM_SEPARACAO", "SEPARADO", "DESPACHADO", "FINALIZADO"].includes(p.status));

  return (
    <main className="flex-1 p-4 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Pedidos Financeiros</h1>
        <p className="text-xs text-slate-500">Pre-aprovacao, faturamento e autorizacao de pedidos</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {filtros.map((f) => (
          <button
            key={f.value}
            onClick={() => setFiltro(f.value)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
              filtro === f.value
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}</div>
      ) : (
        <div className="space-y-6">
          {showPreAprovacao && preAprovacao.length > 0 && (
            <Card>
              <CardHeader className="bg-amber-50/50 border-b pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-amber-600" />
                  Pre-Aprovacao Financeira
                  <Badge className="ml-2 bg-amber-100 text-amber-700">{preAprovacao.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                {preAprovacao.map((p: any) => (
                  <div key={p.id} className="rounded-xl border p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-xs font-bold text-slate-500">#{p.numero.slice(-8)}</span>
                          <Badge variant="outline" className={cn("text-[9px]", p.tipoPedido === "PEDIDO_NORMAL" ? "bg-blue-50 text-blue-600" : "bg-orange-50 text-orange-600")}>
                            {p.tipoPedido === "PEDIDO_NORMAL" ? "Normal (NF)" : "Interno"}
                          </Badge>
                          {p.formaPagamento && (
                            <Badge variant="outline" className="text-[9px] bg-slate-50">{formaLabel[p.formaPagamento] || p.formaPagamento}</Badge>
                          )}
                          <Badge className={cn("text-[9px]", statusBadgeColor[p.status] || "bg-slate-100")}>{statusLabel[p.status] || p.status}</Badge>
                        </div>
                        <p className="font-semibold text-slate-800">{p.cliente.razaoSocial}</p>
                        <p className="text-xs text-slate-400">Vendedor: {p.vendedor?.nome || "Direto"} · {new Date(p.createdAt).toLocaleDateString("pt-BR")}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-slate-800">R$ {p.valorTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                        <p className="text-xs text-slate-400">Desc: R$ {(p.desconto || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                      </div>
                    </div>

                    <HistoricoCliente clienteId={p.clienteId} />

                    {editando === p.id ? (
                      <div className="bg-slate-50 p-3 rounded-lg space-y-3 mb-3 border border-slate-200">
                        <div className="flex justify-between items-center mb-1">
                          <p className="text-[10px] font-semibold text-slate-500 uppercase">Revisao do Pedido</p>
                          <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => setEditando(null)}><XCircle className="h-3 w-3 mr-1" /> Cancelar</Button>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <label className="text-[10px] font-semibold text-slate-500">Forma Pagamento</label>
                            <Select value={edicao[p.id]?.formaPagamento || p.formaPagamento || ""} onValueChange={(v) => handleEdit(p.id, "formaPagamento", v)}>
                              <SelectTrigger className="h-8 text-xs bg-white"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {Object.entries(formaLabel).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <label className="text-[10px] font-semibold text-slate-500">Prazo (Dias)</label>
                            <Input type="number" className="h-8 text-xs bg-white" value={edicao[p.id]?.prazoPagamento ?? p.prazoPagamento ?? ""} onChange={(e) => handleEdit(p.id, "prazoPagamento", e.target.value)} />
                          </div>
                          <div>
                            <label className="text-[10px] font-semibold text-slate-500">Desconto (R$)</label>
                            <Input type="number" className="h-8 text-xs bg-white" value={edicao[p.id]?.desconto ?? p.desconto ?? ""} onChange={(e) => handleEdit(p.id, "desconto", e.target.value)} />
                          </div>
                        </div>
                        <Button size="sm" className="w-full bg-blue-600 hover:bg-blue-700 h-8 text-xs" onClick={() => salvarEdicao(p.id)}>
                          <Save className="h-3 w-3 mr-1" /> Salvar Revisao
                        </Button>
                      </div>
                    ) : (
                      <div className="flex justify-end mb-2 mt-2">
                        <Button size="sm" variant="ghost" className="h-6 text-[10px] text-blue-600 hover:text-blue-700 hover:bg-blue-50" onClick={() => {
                          setEditando(p.id);
                          setEdicao({ ...edicao, [p.id]: { formaPagamento: p.formaPagamento, prazoPagamento: p.prazoPagamento, desconto: p.desconto } });
                        }}>
                          <Edit2 className="h-3 w-3 mr-1" /> Revisar Valores
                        </Button>
                      </div>
                    )}

                    <div className="bg-slate-50 rounded-lg p-3">
                      <p className="text-[10px] font-semibold text-slate-500 uppercase mb-1">Itens</p>
                      {p.itens.map((item: any, i: number) => (
                        <div key={i} className="flex justify-between py-1 text-sm border-b border-slate-100 last:border-0">
                          <span className="text-slate-700">{item.produto.descricao}</span>
                          <span className="text-slate-500">{item.quantidade} x R$ {item.precoUnitario.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} = R$ {item.subtotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center gap-3 pt-2 flex-wrap">
                      {p.status !== "APROVADO_FINANCEIRO" && p.status !== "AGUARDANDO_CONFIRMACAO_CLIENTE" && (
                        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-xs" onClick={() => transicionar(p.id, "aprovar")}>
                          <CheckCircle2 className="h-3 w-3 mr-1" />{p.status === "AGUARDANDO_APROVACAO_FINANCEIRA" ? "Pre-Aprovar" : "Voltar p/ Aprovacao"}
                        </Button>
                      )}
                      <div className="flex-1 min-w-[150px]">
                        <Textarea placeholder="Motivo da reprovacao..." className="h-8 text-xs resize-none"
                          value={motivoReprovar[p.id] || ""}
                          onChange={(e) => setMotivoReprovar({ ...motivoReprovar, [p.id]: e.target.value })} />
                      </div>
                      <Button size="sm" variant="outline" className="text-xs border-red-300 text-red-600 hover:bg-red-50"
                        onClick={() => transicionar(p.id, "reprovar", { observacao: motivoReprovar[p.id] })}>
                        <XCircle className="h-3 w-3 mr-1" /> Reprovar
                      </Button>
                      {p.status !== "PAGAMENTO_PENDENTE" && (
                        <Button size="sm" variant="outline" className="text-xs border-orange-300 text-orange-600 hover:bg-orange-50"
                          onClick={() => transicionar(p.id, "pagamento_pendente", { observacao: motivoReprovar[p.id] })}>
                          Pagamento
                        </Button>
                      )}
                      {p.status !== "CONDICAO_COMERCIAL_PENDENTE" && (
                        <Button size="sm" variant="outline" className="text-xs border-orange-300 text-orange-600 hover:bg-orange-50"
                          onClick={() => transicionar(p.id, "condicao_pendente", { observacao: motivoReprovar[p.id] })}>
                          Condicao
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" className="text-xs text-slate-500 hover:bg-slate-100 ml-auto"
                        onClick={() => enviarRevisao(p.id)} disabled={enviandoRevisao[p.id]}>
                        <Send className="h-3 w-3 mr-1" /> Revisao
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {showFaturamento && faturamento.length > 0 && (
            <Card>
              <CardHeader className="bg-green-50/50 border-b pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Receipt className="h-5 w-5 text-green-600" />
                  Faturamento
                  <Badge className="ml-2 bg-green-100 text-green-700">{faturamento.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                {faturamento.map((p: any) => (
                  <div key={p.id} className="rounded-xl border p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-xs font-bold text-slate-500">#{p.numero.slice(-8)}</span>
                          <Badge variant="outline" className={cn("text-[9px]", p.tipoPedido === "PEDIDO_NORMAL" ? "bg-blue-50 text-blue-600" : "bg-orange-50 text-orange-600")}>
                            {p.tipoPedido === "PEDIDO_NORMAL" ? "Normal (NF)" : "Interno"}
                          </Badge>
                          {p.formaPagamento && (
                            <Badge variant="outline" className="text-[9px] bg-slate-50">{formaLabel[p.formaPagamento] || p.formaPagamento}</Badge>
                          )}
                          <Badge className={cn("text-[9px]", statusBadgeColor[p.status] || "bg-slate-100")}>{statusLabel[p.status] || p.status}</Badge>
                        </div>
                        <p className="font-semibold text-slate-800">{p.cliente.razaoSocial}</p>
                      </div>
                      <p className="text-lg font-bold text-slate-800">R$ {p.valorTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                    </div>

                    <HistoricoCliente clienteId={p.clienteId} />

                    <div className="bg-slate-50 rounded-lg p-3">
                      <p className="text-[10px] font-semibold text-slate-500 uppercase mb-1">Historico do Pedido</p>
                      {(p.historico || []).slice(0, 5).map((h: any, i: number) => (
                        <div key={i} className="flex items-center gap-2 py-1 text-[11px] border-b border-slate-100 last:border-0">
                          <Clock className="h-2.5 w-2.5 text-slate-400" />
                          <span className="text-slate-500">{new Date(h.createdAt).toLocaleString("pt-BR")}</span>
                          <Badge variant="outline" className="text-[8px] h-3.5">{h.statusNovo}</Badge>
                          {h.usuario?.nome && <span className="text-slate-400 flex items-center gap-0.5"><User className="h-2 w-2" />{h.usuario.nome}</span>}
                          {h.observacao && <span className="text-slate-400 italic">{h.observacao}</span>}
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center gap-3 pt-2">
                      {p.tipoPedido === "PEDIDO_NORMAL" ? (
                        <>
                          <Select value={empresaFaturar[p.id] || ""} onValueChange={(v) => setEmpresaFaturar({ ...empresaFaturar, [p.id]: v })}>
                            <SelectTrigger className="h-8 text-xs w-[200px]">
                              <SelectValue placeholder="Empresa para NF..." />
                            </SelectTrigger>
                            <SelectContent>
                              {empresas.map((e: any) => <SelectItem key={e.id} value={e.id.toString()}>{e.nomeFantasia || e.razaoSocial}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          <Button size="sm" className="bg-green-600 hover:bg-green-700 text-xs" onClick={() => {
                            const eid = empresaFaturar[p.id];
                            if (!eid) { toast.error("Selecione a empresa emissora (DAC/Pulse)."); return; }
                            setPedidoFaturando(p.id); setEmpresaFaturarAtual(eid); setModalFaturar(true);
                          }}>
                            <FileText className="h-3 w-3 mr-1" /> Faturar & Emitir NF
                          </Button>
                        </>
                      ) : (
                        <Button size="sm" className="bg-green-600 hover:bg-green-700 text-xs" onClick={() => transicionar(p.id, "autorizar_interno")}>
                          <CheckCircle2 className="h-3 w-3 mr-1" /> Autorizar Pedido Interno
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {showFinalizados && finalizados.length > 0 && (
            <Card>
              <CardHeader className="bg-slate-50/50 border-b pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5 text-slate-600" />
                  Pedidos Faturados / Liberados
                  <Badge className="ml-2 bg-slate-100 text-slate-700">{finalizados.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-left border-b text-xs text-slate-500 bg-slate-50">
                      <tr>
                        <th className="py-2 px-3">Pedido</th>
                        <th className="px-3">Cliente</th>
                        <th className="px-3">Tipo</th>
                        <th className="px-3">Valor</th>
                        <th className="px-3">Status</th>
                        <th className="px-3">Data</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {finalizados.map((p: any) => (
                        <tr key={p.id} className="hover:bg-slate-50/50">
                          <td className="py-2 px-3 font-mono text-xs font-bold text-slate-500">#{p.numero.slice(-8)}</td>
                          <td className="px-3 text-slate-700">{p.cliente.razaoSocial}</td>
                          <td className="px-3">
                            <Badge variant="outline" className={cn("text-[9px]", p.tipoPedido === "PEDIDO_NORMAL" ? "bg-blue-50 text-blue-600" : "bg-orange-50 text-orange-600")}>
                              {p.tipoPedido === "PEDIDO_NORMAL" ? "NF" : "Interno"}
                            </Badge>
                          </td>
                          <td className="px-3 font-semibold">R$ {p.valorTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
                          <td className="px-3"><Badge className={cn("text-[9px]", statusBadgeColor[p.status] || "bg-slate-100")}>{statusLabel[p.status] || p.status}</Badge></td>
                          <td className="px-3 text-slate-400 text-xs">{new Date(p.updatedAt).toLocaleDateString("pt-BR")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {pedidos.length === 0 && (
            <div className="text-center py-16 text-slate-400">
              <Receipt className="h-12 w-12 mx-auto mb-3 text-slate-300" />
              <p className="text-sm">Nenhum pedido encontrado neste filtro.</p>
            </div>
          )}
        </div>
      )}

      <FaturarConfirmModal
        pedidoId={pedidoFaturando}
        empresaFiscalId={empresaFaturarAtual ? Number(empresaFaturarAtual) : null}
        empresaNome={empresas.find((e: any) => e.id.toString() === empresaFaturarAtual)?.nomeFantasia || empresas.find((e: any) => e.id.toString() === empresaFaturarAtual)?.razaoSocial || ""}
        open={modalFaturar}
        onOpenChange={setModalFaturar}
        onConfirm={async () => {
          if (!pedidoFaturando) return;
          setFaturando(true);
          try {
            const res = await fetch(`/api/vendas/${pedidoFaturando}/transicao`, {
              method: "POST", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ acao: "faturar", dados: { empresaFiscalId: empresaFaturarAtual ? Number(empresaFaturarAtual) : undefined } }),
            });
            const d = await res.json();
            if (!res.ok) throw new Error(d.error);
            toast.success("Nota fiscal emitida com sucesso!");
            setModalFaturar(false); setPedidoFaturando(null); mutate();
          } catch (err: any) { toast.error(err.message); }
          finally { setFaturando(false); }
        }}
        loading={faturando}
      />
    </main>
  );
}
