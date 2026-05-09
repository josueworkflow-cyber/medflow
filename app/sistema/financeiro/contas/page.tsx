"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Plus, Search, X, DollarSign, CreditCard, Edit2,
  History, Eye, Ban, Calendar, CheckCircle2, ArrowUpRight,
  ArrowDownRight, AlertTriangle, Clock
} from "lucide-react";

type Conta = {
  id: number; tipo: string; descricao: string; valor: number; valorPago: number;
  dataVencimento: string; dataPagamento: string | null; status: string;
  observacao: string | null; formaPagamento: string | null; categoria: string | null;
  parcelaNumero: number | null; parcelaTotal: number | null;
  cliente: { razaoSocial: string } | null;
  fornecedor: { razaoSocial: string } | null;
  pedidoVenda: { numero: string } | null;
  historicoPagamentos: { id: number; valor: number; data: string; formaPagamento: string | null; observacao: string | null }[];
};

type ClienteDevedor = {
  id: number; razaoSocial: string; cnpjCpf: string | null;
  limiteCredito: number; totalAberto: number; totalVencido: number;
  totalAVencer: number; venceEm7Dias: number;
  ultimoPagamento: string | null;
  parcelasAbertas: number; parcelasVencidas: number;
  pedidosVinculados: string[];
};

const statusColor: Record<string, string> = {
  ABERTA: "bg-blue-100 text-blue-700", PAGA: "bg-emerald-100 text-emerald-700",
  VENCIDA: "bg-red-100 text-red-700", CANCELADA: "bg-slate-100 text-slate-500",
};

const formaLabel: Record<string, string> = {
  PIX: "PIX", BOLETO: "Boleto", CARTAO_CREDITO: "Cartao de Credito",
  CARTAO_DEBITO: "Cartao de Debito", DINHEIRO: "Dinheiro",
  TRANSFERENCIA: "Transferencia", A_PRAZO: "A Prazo", CHEQUE: "Cheque",
};

export default function ContasPage() {
  const [contas, setContas] = useState<Conta[]>([]);
  const [devedores, setDevedores] = useState<ClienteDevedor[]>([]);
  const [tab, setTab] = useState<"RECEBER" | "PAGAR" | "DEVEDORES">("RECEBER");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Nova conta
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    tipo: "RECEBER", descricao: "", valor: "", dataVencimento: "",
    observacao: "", formaPagamento: "", categoria: "",
    parcelas: "1", intervalo: "30",
  });

  // Baixa
  const [showBaixa, setShowBaixa] = useState<Conta | null>(null);
  const [baixaForm, setBaixaForm] = useState({ valor: "", data: new Date().toISOString().split("T")[0], formaPagamento: "", observacao: "" });
  const [baixando, setBaixando] = useState(false);

  // Historico
  const [showHistorico, setShowHistorico] = useState<Conta | null>(null);

  // Edicao
  const [showEdicao, setShowEdicao] = useState<Conta | null>(null);
  const [edicaoForm, setEdicaoForm] = useState({ dataVencimento: "", observacao: "" });
  const [editandoConta, setEditandoConta] = useState(false);

  const carregar = useCallback(() => {
    setLoading(true);
    Promise.all([
      fetch("/api/financeiro").then((r) => r.json()).then((d) => setContas(Array.isArray(d) ? d : [])),
      fetch("/api/financeiro/clientes-devedores").then((r) => r.json()).then((d) => setDevedores(Array.isArray(d) ? d : [])),
    ]).finally(() => setLoading(false));
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  async function salvar(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    try {
      const body: any = {
        tipo: form.tipo, descricao: form.descricao.trim(),
        valor: Number(form.valor), dataVencimento: form.dataVencimento,
        observacao: form.observacao, formaPagamento: form.formaPagamento || null,
        categoria: form.categoria || null, parcelas: Number(form.parcelas) || 1,
        intervalo: Number(form.intervalo) || 30,
      };
      const res = await fetch("/api/financeiro", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success("Conta(s) criada(s) com sucesso!");
      setForm({ tipo: "RECEBER", descricao: "", valor: "", dataVencimento: "", observacao: "", formaPagamento: "", categoria: "", parcelas: "1", intervalo: "30" });
      setShowForm(false);
      carregar();
    } catch (err: any) { toast.error(err.message || "Erro ao criar conta"); }
    finally { setSaving(false); }
  }

  async function baixar() {
    if (!showBaixa) return;
    setBaixando(true);
    try {
      const res = await fetch(`/api/financeiro/${showBaixa.id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          acao: "baixa",
          valor: Number(baixaForm.valor),
          data: baixaForm.data,
          formaPagamento: baixaForm.formaPagamento,
          observacao: baixaForm.observacao,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success("Baixa registrada com sucesso!");
      setShowBaixa(null);
      carregar();
    } catch (err: any) { toast.error(err.message || "Erro ao registrar baixa"); }
    finally { setBaixando(false); }
  }

  async function cancelarConta(id: number) {
    if (!confirm("Deseja cancelar esta conta?")) return;
    try {
      const res = await fetch(`/api/financeiro/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Conta cancelada.");
      carregar();
    } catch { toast.error("Erro ao cancelar conta."); }
  }

  async function editarVencimento() {
    if (!showEdicao) return;
    setEditandoConta(true);
    try {
      const res = await fetch(`/api/financeiro/${showEdicao.id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataVencimento: edicaoForm.dataVencimento, observacao: edicaoForm.observacao }),
      });
      if (!res.ok) throw new Error();
      toast.success("Conta atualizada.");
      setShowEdicao(null);
      carregar();
    } catch { toast.error("Erro ao atualizar conta."); }
    finally { setEditandoConta(false); }
  }

  const diasRestantes = (vencimento: string, status: string) => {
    if (status === "PAGA" || status === "CANCELADA") return null;
    const diff = Math.ceil((new Date(vencimento).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (diff < 0) return <span className="text-red-600 font-semibold">{Math.abs(diff)}d atraso</span>;
    if (diff === 0) return <span className="text-amber-600 font-semibold">Vence hoje</span>;
    return <span className="text-slate-500">{diff}d</span>;
  };

  const tipoFiltradas = contas.filter((c) => c.tipo === tab);
  const pesquisadas = search
    ? tipoFiltradas.filter((c) =>
        c.descricao.toLowerCase().includes(search.toLowerCase()) ||
        c.cliente?.razaoSocial?.toLowerCase().includes(search.toLowerCase()) ||
        c.fornecedor?.razaoSocial?.toLowerCase().includes(search.toLowerCase()) ||
        c.pedidoVenda?.numero?.toLowerCase().includes(search.toLowerCase())
      )
    : tipoFiltradas;

  const devedoresFiltrados = search
    ? devedores.filter((d) =>
        d.razaoSocial.toLowerCase().includes(search.toLowerCase()) ||
        (d.cnpjCpf || "").includes(search)
      )
    : devedores;

  return (
    <main className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Contas</h1>
          <p className="text-xs text-slate-500">Contas a receber, contas a pagar e clientes devedores</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="bg-slate-900 hover:bg-slate-800 text-xs">
          <Plus className="h-4 w-4 mr-1" /> Nova conta
        </Button>
      </div>

      <div className="flex items-center gap-2">
        {(["RECEBER", "PAGAR", "DEVEDORES"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === t
                ? t === "DEVEDORES" ? "bg-red-100 text-red-700" : t === "RECEBER" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {t === "RECEBER" ? "Contas a Receber" : t === "PAGAR" ? "Contas a Pagar" : "Clientes / Devedores"}
          </button>
        ))}
        <div className="flex-1" />
        <div className="relative">
          <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            placeholder="Buscar..."
            className="pl-9 h-9 text-xs w-64"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}</div>
      ) : (
        <>
          {/* Contas a Receber e a Pagar */}
          {tab !== "DEVEDORES" && (
            <Card>
              <CardContent className="p-0">
                {pesquisadas.length === 0 ? (
                  <p className="p-8 text-sm text-slate-400 text-center">Nenhuma conta encontrada.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="text-left border-b text-xs text-slate-500 bg-slate-50">
                        <tr>
                          <th className="py-3 px-4">
                            {tab === "RECEBER" ? "Cliente" : "Fornecedor / Categoria"}
                          </th>
                          <th className="px-4">Descricao</th>
                          <th className="px-4">Pedido</th>
                          <th className="px-4">Parcela</th>
                          <th className="px-4">Valor Orig.</th>
                          <th className="px-4">Valor Pago</th>
                          <th className="px-4">Saldo</th>
                          <th className="px-4">Vencimento</th>
                          <th className="px-4">Prazo</th>
                          <th className="px-4">Forma Pgto</th>
                          <th className="px-4">Status</th>
                          <th className="px-4">Acoes</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {pesquisadas.map((c) => {
                          const saldo = c.valor - c.valorPago;
                          return (
                            <tr key={c.id} className="hover:bg-slate-50/50">
                              <td className="py-3 px-4">
                                <span className="font-medium text-slate-700">
                                  {c.cliente?.razaoSocial || c.fornecedor?.razaoSocial || "-"}
                                </span>
                              </td>
                              <td className="px-4 text-slate-600 max-w-[120px] truncate" title={c.descricao}>
                                {c.categoria && <span className="text-[9px] text-slate-400 block">{c.categoria}</span>}
                                {c.descricao}
                              </td>
                              <td className="px-4">
                                {c.pedidoVenda?.numero && (
                                  <span className="font-mono text-[10px] text-blue-600">#{c.pedidoVenda.numero.slice(-8)}</span>
                                )}
                              </td>
                              <td className="px-4 text-xs text-slate-400">
                                {c.parcelaNumero && c.parcelaTotal ? `${c.parcelaNumero}/${c.parcelaTotal}` : "-"}
                              </td>
                              <td className="px-4 font-semibold">R$ {c.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
                              <td className="px-4 text-emerald-600">R$ {c.valorPago.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
                              <td className={`px-4 font-semibold ${saldo > 0 ? "text-amber-600" : "text-emerald-600"}`}>
                                R$ {saldo.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                              </td>
                              <td className="px-4 text-slate-500 text-xs">{new Date(c.dataVencimento).toLocaleDateString("pt-BR")}</td>
                              <td className="px-4 text-xs">{diasRestantes(c.dataVencimento, c.status)}</td>
                              <td className="px-4 text-xs text-slate-500">
                                {c.formaPagamento ? formaLabel[c.formaPagamento] || c.formaPagamento : "-"}
                              </td>
                              <td className="px-4"><Badge className={statusColor[c.status] || "bg-slate-100"}>{c.status}</Badge></td>
                              <td className="px-4">
                                <div className="flex items-center gap-1">
                                  {(c.status === "ABERTA" || c.status === "VENCIDA") && (
                                    <Button size="sm" variant="ghost" className="h-7 text-[10px] text-emerald-600 hover:bg-emerald-50"
                                      onClick={() => {
                                        setShowBaixa(c);
                                        setBaixaForm({
                                          valor: (c.valor - c.valorPago).toString(),
                                          data: new Date().toISOString().split("T")[0],
                                          formaPagamento: c.formaPagamento || "",
                                          observacao: "",
                                        });
                                      }}>
                                      <DollarSign className="h-3 w-3 mr-0.5" /> Baixar
                                    </Button>
                                  )}
                                  {c.status !== "CANCELADA" && c.status !== "PAGA" && (
                                    <Button size="sm" variant="ghost" className="h-7 text-[10px]"
                                      onClick={() => {
                                        setShowEdicao(c);
                                        setEdicaoForm({
                                          dataVencimento: new Date(c.dataVencimento).toISOString().split("T")[0],
                                          observacao: c.observacao || "",
                                        });
                                      }}>
                                      <Edit2 className="h-3 w-3" />
                                    </Button>
                                  )}
                                  <Button size="sm" variant="ghost" className="h-7 text-[10px]"
                                    onClick={() => setShowHistorico(c)}>
                                    <History className="h-3 w-3" />
                                  </Button>
                                  {c.status !== "CANCELADA" && (
                                    <Button size="sm" variant="ghost" className="h-7 text-[10px] text-red-500 hover:bg-red-50"
                                      onClick={() => cancelarConta(c.id)}>
                                      <Ban className="h-3 w-3" />
                                    </Button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Clientes Devedores */}
          {tab === "DEVEDORES" && (
            <Card>
              <CardContent className="p-0">
                {devedoresFiltrados.length === 0 ? (
                  <p className="p-8 text-sm text-slate-400 text-center">Nenhum cliente com pendencia.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="text-left border-b text-xs text-slate-500 bg-slate-50">
                        <tr>
                          <th className="py-3 px-4">Cliente</th>
                          <th className="px-4">Total Aberto</th>
                          <th className="px-4">Total Vencido</th>
                          <th className="px-4">A Vencer</th>
                          <th className="px-4">Vence 7d</th>
                          <th className="px-4">Ultimo Pgto</th>
                          <th className="px-4">Parc. Abertas</th>
                          <th className="px-4">Parc. Vencidas</th>
                          <th className="px-4">Pedidos</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {devedoresFiltrados.map((d) => (
                          <tr key={d.id} className="hover:bg-slate-50/50">
                            <td className="py-3 px-4">
                              <span className="font-medium text-slate-700">{d.razaoSocial}</span>
                              {d.cnpjCpf && <span className="text-[10px] text-slate-400 block">{d.cnpjCpf}</span>}
                            </td>
                            <td className="px-4 font-semibold text-amber-600">R$ {d.totalAberto.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
                            <td className={`px-4 font-semibold ${d.totalVencido > 0 ? "text-red-600" : "text-slate-500"}`}>
                              R$ {d.totalVencido.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                            </td>
                            <td className="px-4 text-blue-600">R$ {d.totalAVencer.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
                            <td className={`px-4 font-semibold ${d.venceEm7Dias > 0 ? "text-amber-600" : "text-slate-400"}`}>
                              R$ {d.venceEm7Dias.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                            </td>
                            <td className="px-4 text-xs text-slate-500">
                              {d.ultimoPagamento ? new Date(d.ultimoPagamento).toLocaleDateString("pt-BR") : "-"}
                            </td>
                            <td className="px-4">{d.parcelasAbertas}</td>
                            <td className={`px-4 ${d.parcelasVencidas > 0 ? "text-red-600 font-semibold" : ""}`}>{d.parcelasVencidas}</td>
                            <td className="px-4">
                              <div className="flex flex-wrap gap-1">
                                {d.pedidosVinculados.map((p, i) => (
                                  <Badge key={i} variant="outline" className="text-[9px] font-mono">{p.slice(-8)}</Badge>
                                ))}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Modal: Nova Conta */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Nova Conta</h2>
              <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}><X className="h-4 w-4" /></Button>
            </div>
            <form onSubmit={salvar} className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">Tipo *</label>
                <select className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" value={form.tipo}
                  onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
                  <option value="RECEBER">A receber</option>
                  <option value="PAGAR">A pagar</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">Descricao *</label>
                <Input required value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">Categoria</label>
                <Input value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} placeholder="Ex: Fornecedor, Operacional, Tributario..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-500">Valor total (R$) *</label>
                  <Input type="number" step="0.01" required value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-500">Forma pagamento</label>
                  <select className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" value={form.formaPagamento}
                    onChange={(e) => setForm({ ...form, formaPagamento: e.target.value })}>
                    <option value="">Selecione...</option>
                    {Object.entries(formaLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-500">Vencimento *</label>
                  <Input type="date" required value={form.dataVencimento} onChange={(e) => setForm({ ...form, dataVencimento: e.target.value })} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-500">Parcelas</label>
                  <Input type="number" min="1" value={form.parcelas} onChange={(e) => setForm({ ...form, parcelas: e.target.value })} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-500">Intervalo (dias)</label>
                  <Input type="number" min="1" value={form.intervalo} onChange={(e) => setForm({ ...form, intervalo: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">Observacoes</label>
                <Textarea className="resize-none" value={form.observacao} onChange={(e) => setForm({ ...form, observacao: e.target.value })} />
              </div>
              {Number(form.parcelas) > 1 && (
                <div className="bg-blue-50 rounded-xl p-3 text-xs text-blue-700">
                  Serao geradas {form.parcelas} parcelas de R$ {(Number(form.valor) / Number(form.parcelas)).toLocaleString("pt-BR", { minimumFractionDigits: 2 })} cada,
                  com intervalo de {form.intervalo} dias.
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setShowForm(false)}>Cancelar</Button>
                <Button type="submit" className="flex-1 bg-slate-900 hover:bg-slate-800" disabled={saving}>
                  {saving ? "Salvando..." : "Cadastrar conta"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Baixa Financeira */}
      {showBaixa && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowBaixa(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Registrar {showBaixa.tipo === "RECEBER" ? "Recebimento" : "Pagamento"}</h2>
              <Button variant="ghost" size="sm" onClick={() => setShowBaixa(null)}><X className="h-4 w-4" /></Button>
            </div>
            <div className="bg-slate-50 rounded-xl p-3 space-y-1 text-sm">
              <p className="font-medium">{showBaixa.descricao}</p>
              <p className="text-slate-500">Valor original: R$ {showBaixa.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
              <p className="text-slate-500">Ja pago: R$ {showBaixa.valorPago.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
              <p className="text-amber-600 font-semibold">Saldo em aberto: R$ {(showBaixa.valor - showBaixa.valorPago).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
            </div>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">Valor {showBaixa.tipo === "RECEBER" ? "recebido" : "pago"} (R$) *</label>
                <Input type="number" step="0.01" required value={baixaForm.valor}
                  onChange={(e) => setBaixaForm({ ...baixaForm, valor: e.target.value })} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">Data do {showBaixa.tipo === "RECEBER" ? "recebimento" : "pagamento"}</label>
                <Input type="date" value={baixaForm.data}
                  onChange={(e) => setBaixaForm({ ...baixaForm, data: e.target.value })} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">Forma de pagamento</label>
                <select className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" value={baixaForm.formaPagamento}
                  onChange={(e) => setBaixaForm({ ...baixaForm, formaPagamento: e.target.value })}>
                  <option value="">Selecione...</option>
                  {Object.entries(formaLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">Observacao</label>
                <Textarea className="resize-none" value={baixaForm.observacao}
                  onChange={(e) => setBaixaForm({ ...baixaForm, observacao: e.target.value })} />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowBaixa(null)}>Cancelar</Button>
              <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700" onClick={baixar} disabled={baixando}>
                {baixando ? "Registrando..." : "Confirmar baixa"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Historico */}
      {showHistorico && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowHistorico(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Historico de Pagamentos</h2>
              <Button variant="ghost" size="sm" onClick={() => setShowHistorico(null)}><X className="h-4 w-4" /></Button>
            </div>
            <div className="bg-slate-50 rounded-xl p-3 space-y-1 text-sm">
              <p className="font-medium">{showHistorico.descricao}</p>
              <p className="text-slate-500">Valor total: R$ {showHistorico.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
              <p className="text-emerald-600">Total pago: R$ {showHistorico.valorPago.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
            </div>
            {showHistorico.historicoPagamentos.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">Nenhum pagamento registrado.</p>
            ) : (
              <div className="space-y-2">
                {showHistorico.historicoPagamentos.map((h) => (
                  <div key={h.id} className="flex items-center justify-between border-b pb-2 text-sm">
                    <div>
                      <p className="font-medium text-slate-700">R$ {h.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                      <p className="text-xs text-slate-400">{new Date(h.data).toLocaleString("pt-BR")}</p>
                      {h.formaPagamento && <p className="text-[10px] text-slate-500">{formaLabel[h.formaPagamento] || h.formaPagamento}</p>}
                    </div>
                    {h.observacao && <p className="text-xs text-slate-400 max-w-[200px] text-right">{h.observacao}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal: Editar Vencimento */}
      {showEdicao && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowEdicao(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Editar Conta</h2>
              <Button variant="ghost" size="sm" onClick={() => setShowEdicao(null)}><X className="h-4 w-4" /></Button>
            </div>
            <p className="text-sm text-slate-600">{showEdicao.descricao}</p>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Nova data de vencimento</label>
              <Input type="date" value={edicaoForm.dataVencimento}
                onChange={(e) => setEdicaoForm({ ...edicaoForm, dataVencimento: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Observacao</label>
              <Textarea className="resize-none" value={edicaoForm.observacao}
                onChange={(e) => setEdicaoForm({ ...edicaoForm, observacao: e.target.value })} />
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowEdicao(null)}>Cancelar</Button>
              <Button className="flex-1 bg-slate-900 hover:bg-slate-800" onClick={editarVencimento} disabled={editandoConta}>
                {editandoConta ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
