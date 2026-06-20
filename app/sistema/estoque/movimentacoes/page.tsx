"use client";

import { useState, useCallback } from "react";
import useSWR from "swr";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  ArrowDownRight, ArrowUpRight, RefreshCw, Clock, Package, Hash, Calendar, Search,
  Eye, X, Filter, ChevronDown, ChevronUp, User, FileText, Building2,
  AlertTriangle, Layers, RotateCcw, Ban, Boxes, Pencil, History,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { HistoricoAlteracoes } from "@/components/auditoria/historico-alteracoes";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type Movimentacao = {
  id: number;
  tipo: string;
  quantidade: number;
  observacao: string | null;
  origem: string | null;
  destino: string | null;
  createdAt: string;
  produto: { descricao: string; codigoInterno: string | null } | null;
  lote: { numeroLote: string; validade: string | null } | null;
  localizacao: { nome: string } | null;
  usuarioRef: { nome: string } | null;
  empresaFiscal: { nomeFantasia: string | null; razaoSocial: string } | null;
  pedidoVenda: {
    numero: string;
    tipoPedido: string;
    cliente: { razaoSocial: string } | null;
  } | null;
  movimentacaoFiscal: {
    documentoFiscal: { numero: string; tipo: string } | null;
  } | null;
  estornado?: boolean;
  isEstorno?: boolean;
};

type Totais = {
  entradasMes: number;
  saidasMes: number;
  reservasMes: number;
  ajustesMes: number;
  movDia: number;
};

const tipoConfig: Record<string, { label: string; color: string; icon: any; bgLight: string }> = {
  ENTRADA: { label: "Entrada", color: "bg-emerald-100 text-emerald-700 border-emerald-200", bgLight: "bg-emerald-50/40", icon: ArrowDownRight },
  SAIDA: { label: "Saida", color: "bg-red-100 text-red-700 border-red-200", bgLight: "bg-red-50/40", icon: ArrowUpRight },
  AJUSTE: { label: "Ajuste", color: "bg-amber-100 text-amber-700 border-amber-200", bgLight: "bg-amber-50/40", icon: RefreshCw },
  RESERVA: { label: "Reserva", color: "bg-blue-100 text-blue-700 border-blue-200", bgLight: "bg-blue-50/40", icon: Clock },
  CANCELAMENTO_RESERVA: { label: "Canc. Reserva", color: "bg-slate-100 text-slate-600 border-slate-200", bgLight: "bg-slate-50/40", icon: Ban },
  DEVOLUCAO: { label: "Devolucao", color: "bg-purple-100 text-purple-700 border-purple-200", bgLight: "bg-purple-50/40", icon: ArrowDownRight },
  PERDA: { label: "Perda", color: "bg-rose-100 text-rose-700 border-rose-200", bgLight: "bg-rose-50/40", icon: AlertTriangle },
};

const quickFilters = [
  { value: "hoje", label: "Hoje" },
  { value: "7d", label: "7 dias" },
  { value: "30d", label: "30 dias" },
  { value: "ENTRADA", label: "Entradas" },
  { value: "SAIDA", label: "Saidas" },
  { value: "RESERVA", label: "Reservas" },
  { value: "AJUSTE,PERDA", label: "Ajustes" },
];

export default function MovimentacoesPage() {
  const [filtroRapido, setFiltroRapido] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState({
    produto: "", pedido: "", usuario: "", lote: "", origem: "",
  });
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [modalMov, setModalMov] = useState<Movimentacao | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [movToEstornar, setMovToEstornar] = useState<number | null>(null);
  const [isEstornando, setIsEstornando] = useState(false);

  // Edit Entrada states
  const [editingMov, setEditingMov] = useState<Movimentacao | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    quantidade: "",
    observacao: "",
    origem: "",
  });
  const [editMotivo, setEditMotivo] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  // History states
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [historyMovId, setHistoryMovId] = useState<number | null>(null);

  const openEditEntrada = (mov: Movimentacao) => {
    setEditingMov(mov);
    setEditForm({
      quantidade: String(mov.quantidade),
      observacao: mov.observacao || "",
      origem: mov.origem || "",
    });
    setEditMotivo("");
    setIsEditDialogOpen(true);
  };

  const salvarEdicaoEntrada = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMov) return;

    const qtd = Number(editForm.quantidade);
    if (isNaN(qtd) || qtd < 0.001) {
      return toast.error("Quantidade mínima é 0.001");
    }

    try {
      setSavingEdit(true);
      const payload = {
        quantidade: qtd,
        observacao: editForm.observacao !== "" ? editForm.observacao.trim() : null,
        origem: editForm.origem !== "" ? editForm.origem.trim() : null,
        motivo: editMotivo,
      };

      const res = await fetch(`/api/estoque/movimentacoes/${editingMov.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const resultado = await res.json();
      if (!res.ok) throw new Error(resultado.error);

      toast.success("Movimentação atualizada com sucesso!");
      setIsEditDialogOpen(false);
      setEditingMov(null);
      setModalMov(null);
      mutate();
    } catch (err: any) {
      toast.error(err.message || "Erro ao atualizar movimentação.");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleEstornarClick = (movId: number) => {
    setMovToEstornar(movId);
    setIsConfirmOpen(true);
  };

  const confirmEstorno = async (movId: number) => {
    setIsEstornando(true);
    try {
      const res = await fetch(`/api/estoque/movimentacoes/${movId}/estornar`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Erro ao estornar a entrada.");
      }
      toast.success("Entrada estornada com sucesso!");
      setIsConfirmOpen(false);
      setModalMov(null);
      mutate();
    } catch (err: any) {
      toast.error(err.message || "Erro ao estornar.");
    } finally {
      setIsEstornando(false);
    }
  };

  function buildUrl() {
    const p = new URLSearchParams();
    if (filtroRapido === "hoje") {
      const d = new Date();
      p.set("dataInicio", new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString());
    } else if (filtroRapido === "7d") {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      p.set("dataInicio", d.toISOString());
    } else if (filtroRapido === "30d") {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      p.set("dataInicio", d.toISOString());
    } else if (filtroRapido) {
      p.set("tipo", filtroRapido);
    }
    if (dataInicio) p.set("dataInicio", dataInicio);
    if (dataFim) p.set("dataFim", dataFim);
    if (advancedFilters.produto) p.set("produto", advancedFilters.produto);
    if (advancedFilters.pedido) p.set("pedido", advancedFilters.pedido);
    if (advancedFilters.usuario) p.set("usuario", advancedFilters.usuario);
    if (advancedFilters.lote) p.set("lote", advancedFilters.lote);
    if (advancedFilters.origem) p.set("origem", advancedFilters.origem);
    return `/api/estoque/movimentacoes?${p.toString()}`;
  }

  const { data, isLoading, mutate } = useSWR(buildUrl, fetcher, {
    refreshInterval: 60000,
  });

  const items: Movimentacao[] = data?.movimentacoes || [];
  const totais: Totais = data?.totais || { entradasMes: 0, saidasMes: 0, reservasMes: 0, ajustesMes: 0, movDia: 0 };

  const kpis = [
    { label: "Entradas do mes", value: totais.entradasMes, color: "emerald", icon: ArrowDownRight },
    { label: "Saidas do mes", value: totais.saidasMes, color: "red", icon: ArrowUpRight },
    { label: "Reservas do mes", value: totais.reservasMes, color: "blue", icon: Clock },
    { label: "Ajustes realizados", value: totais.ajustesMes, color: "amber", icon: RefreshCw },
    { label: "Movimentacoes do dia", value: totais.movDia, color: "violet", icon: Calendar },
  ];

  return (
    <main className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Movimentacoes de Estoque</h1>
          <p className="text-xs text-slate-500">Historico, auditoria e rastreabilidade de todas as movimentacoes</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)} className="h-8 text-xs gap-1">
            <Filter className="h-3 w-3" />
            Filtros
            {showFilters ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </Button>
          <Button variant="outline" size="sm" onClick={() => { setFiltroRapido(null); setAdvancedFilters({ produto: "", pedido: "", usuario: "", lote: "", origem: "" }); setDataInicio(""); setDataFim(""); }} className="h-8 text-xs gap-1">
            <RotateCcw className="h-3 w-3" />
            Limpar
          </Button>
          <Button variant="outline" size="sm" onClick={() => mutate()} className="h-8 text-xs gap-1">
            <RefreshCw className="h-3 w-3" /> Atualizar
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-5 gap-3">
        {kpis.map((kpi) => (
          <Card key={kpi.label} className={`border-l-4 ${
            kpi.color === "emerald" ? "border-l-emerald-500" :
            kpi.color === "red" ? "border-l-red-500" :
            kpi.color === "blue" ? "border-l-blue-500" :
            kpi.color === "amber" ? "border-l-amber-500" :
            "border-l-violet-500"
          }`}>
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">{kpi.label}</p>
                <kpi.icon className={`h-3.5 w-3.5 ${
                  kpi.color === "emerald" ? "text-emerald-500" :
                  kpi.color === "red" ? "text-red-500" :
                  kpi.color === "blue" ? "text-blue-500" :
                  kpi.color === "amber" ? "text-amber-500" :
                  "text-violet-500"
                }`} />
              </div>
              <p className={`text-xl font-bold ${
                kpi.color === "emerald" ? "text-emerald-700" :
                kpi.color === "red" ? "text-red-700" :
                kpi.color === "blue" ? "text-blue-700" :
                kpi.color === "amber" ? "text-amber-700" :
                "text-violet-700"
              }`}>
                {kpi.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick filters */}
      <div className="flex flex-wrap items-center gap-2">
        {quickFilters.map((f) => (
          <button
            key={f.value}
            onClick={() => setFiltroRapido(filtroRapido === f.value ? null : f.value)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
              filtroRapido === f.value
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            )}
          >
            {f.label}
          </button>
        ))}
        <div className="w-px h-5 bg-slate-200 mx-1" />
        <Input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} className="w-[140px] h-8 text-xs" />
        <span className="text-xs text-slate-400">ate</span>
        <Input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} className="w-[140px] h-8 text-xs" />
      </div>

      {/* Advanced filters */}
      {showFilters && (
        <div className="bg-white rounded-xl border p-4 space-y-3">
          <div className="grid grid-cols-6 gap-3">
            <div>
              <label className="mb-1 block text-[10px] font-semibold text-slate-500 uppercase">Produto</label>
              <Input placeholder="Descricao..." className="h-8 text-xs" value={advancedFilters.produto}
                onChange={(e) => setAdvancedFilters({ ...advancedFilters, produto: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-semibold text-slate-500 uppercase">Pedido</label>
              <Input placeholder="Numero..." className="h-8 text-xs" value={advancedFilters.pedido}
                onChange={(e) => setAdvancedFilters({ ...advancedFilters, pedido: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-semibold text-slate-500 uppercase">Usuario</label>
              <Input placeholder="Nome..." className="h-8 text-xs" value={advancedFilters.usuario}
                onChange={(e) => setAdvancedFilters({ ...advancedFilters, usuario: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-semibold text-slate-500 uppercase">Lote</label>
              <Input placeholder="Numero..." className="h-8 text-xs" value={advancedFilters.lote}
                onChange={(e) => setAdvancedFilters({ ...advancedFilters, lote: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-semibold text-slate-500 uppercase">Origem</label>
              <Input placeholder="Origem..." className="h-8 text-xs" value={advancedFilters.origem}
                onChange={(e) => setAdvancedFilters({ ...advancedFilters, origem: e.target.value })} />
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">{[...Array(8)].map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}</div>
          ) : items.length === 0 ? (
            <div className="py-20 text-center text-slate-400">
              <Boxes className="h-12 w-12 mx-auto mb-3 text-slate-200" />
              <p className="text-sm font-medium">Nenhuma movimentacao encontrada</p>
              <p className="text-xs mt-1">Ajuste os filtros ou periodo para visualizar os registros.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left border-b bg-slate-50/80">
                  <tr className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4 w-10"></th>
                    <th className="px-3">Produto</th>
                    <th className="px-3">Tipo</th>
                    <th className="px-3">Qtd</th>
                    <th className="px-3">Lote</th>
                    <th className="px-3">Pedido</th>
                    <th className="px-3">Origem</th>
                    <th className="px-3">Empresa</th>
                    <th className="px-3">Usuario</th>
                    <th className="px-3">Data</th>
                    <th className="px-3 w-12"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.slice(0, 200).map((mov: Movimentacao) => {
                    const cfg = tipoConfig[mov.tipo] || tipoConfig.ENTRADA;
                    const TipoIcon = cfg.icon;
                    const isEntrada = ["ENTRADA", "DEVOLUCAO"].includes(mov.tipo);
                    const isSaida = ["SAIDA", "PERDA"].includes(mov.tipo);
                    return (
                      <tr key={mov.id} className={cn("hover:bg-slate-50/40 transition-colors", cfg.bgLight)}>
                        <td className="py-2.5 px-4">
                          <div className={cn("p-1.5 rounded-lg", cfg.color)}>
                            <TipoIcon className="h-3.5 w-3.5" />
                          </div>
                        </td>
                        <td className="px-3">
                          <div className="max-w-[180px]">
                            <p className="text-slate-800 font-medium text-xs truncate" title={mov.produto?.descricao || ""}>
                              {mov.produto?.descricao || `#${mov.produto?.codigoInterno || "-"}`}
                            </p>
                            {mov.produto?.codigoInterno && (
                              <p className="text-[10px] text-slate-400 font-mono">{mov.produto.codigoInterno}</p>
                            )}
                          </div>
                        </td>
                        <td className="px-3">
                          <Badge className={cn("text-[9px] border", mov.isEstorno ? "bg-slate-100 text-slate-600 border-slate-200" : cfg.color)}>
                            {mov.isEstorno ? "Estorno" : cfg.label}
                          </Badge>
                        </td>
                        <td className="px-3">
                          <div className="flex flex-col">
                            <span className={cn("font-bold text-xs",
                              isEntrada ? "text-emerald-600" : isSaida ? "text-red-600" : "text-slate-600",
                              mov.estornado && "line-through opacity-50"
                            )}>
                              {isEntrada ? "+" : isSaida ? "-" : ""}{mov.quantidade}
                            </span>
                            {mov.estornado && (
                              <span className="text-[9px] font-semibold text-amber-600 uppercase">Estornado</span>
                            )}
                          </div>
                        </td>
                        <td className="px-3">
                          {mov.lote ? (
                            <div>
                              <span className="text-xs font-mono text-slate-600">{mov.lote.numeroLote}</span>
                              {mov.lote.validade && (
                                <p className="text-[10px] text-slate-400">
                                  {new Date(mov.lote.validade).toLocaleDateString("pt-BR")}
                                </p>
                              )}
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-300">-</span>
                          )}
                        </td>
                        <td className="px-3">
                          {mov.pedidoVenda ? (
                            <div>
                              <p className="text-xs font-mono font-bold text-blue-600">#{mov.pedidoVenda.numero.slice(-8)}</p>
                              <Badge variant="outline" className={cn("text-[8px] mt-0.5",
                                mov.pedidoVenda.tipoPedido === "PEDIDO_NORMAL"
                                  ? "bg-blue-50 text-blue-600 border-blue-200"
                                  : "bg-orange-50 text-orange-600 border-orange-200"
                              )}>
                                {mov.pedidoVenda.tipoPedido === "PEDIDO_NORMAL" ? "NF" : "Interno"}
                              </Badge>
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-300">-</span>
                          )}
                        </td>
                        <td className="px-3 max-w-[120px]">
                          <p className="text-xs text-slate-500 truncate" title={mov.origem || ""}>
                            {mov.origem || "-"}
                          </p>
                        </td>
                        <td className="px-3">
                          {mov.empresaFiscal ? (
                            <Badge variant="outline" className="text-[9px] bg-slate-50">
                              {mov.empresaFiscal.nomeFantasia || mov.empresaFiscal.razaoSocial}
                            </Badge>
                          ) : (
                            <span className="text-[10px] text-slate-300">-</span>
                          )}
                        </td>
                        <td className="px-3">
                          <div className="flex items-center gap-1.5">
                            <User className="h-3 w-3 text-slate-400" />
                            <span className="text-xs text-slate-500">{mov.usuarioRef?.nome || "Sistema"}</span>
                          </div>
                        </td>
                        <td className="px-3">
                          <p className="text-xs text-slate-500">{new Date(mov.createdAt).toLocaleDateString("pt-BR")}</p>
                          <p className="text-[10px] text-slate-400">{new Date(mov.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</p>
                        </td>
                        <td className="px-3">
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0"
                            onClick={() => setModalMov(mov)}>
                            <Eye className="h-3.5 w-3.5 text-slate-400" />
                          </Button>
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

      {/* Detail Modal */}
      {modalMov && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-start justify-end p-4" onClick={() => setModalMov(null)}>
          <div className="bg-white w-full max-w-lg h-full overflow-y-auto shadow-2xl rounded-l-2xl p-6 space-y-5"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between sticky top-0 bg-white pb-3 border-b">
              <h2 className="text-lg font-bold text-slate-900">Detalhes da Movimentacao</h2>
              <Button variant="ghost" size="sm" onClick={() => setModalMov(null)}><X className="h-4 w-4" /></Button>
            </div>

            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Produto</p>
                  <p className="font-semibold text-slate-800">{modalMov.produto?.descricao || "-"}</p>
                  {modalMov.produto?.codigoInterno && (
                    <p className="text-xs text-slate-400 font-mono">{modalMov.produto.codigoInterno}</p>
                  )}
                </div>
                <Badge className={cn("text-[10px] border", (tipoConfig[modalMov.tipo] || tipoConfig.ENTRADA).color)}>
                  {(tipoConfig[modalMov.tipo] || tipoConfig.ENTRADA).label}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-3 bg-slate-50 rounded-xl p-4">
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-semibold">Quantidade</p>
                  <p className={cn("text-lg font-bold", ["ENTRADA", "DEVOLUCAO"].includes(modalMov.tipo) ? "text-emerald-600" : ["SAIDA", "PERDA"].includes(modalMov.tipo) ? "text-red-600" : "text-slate-800")}>
                    {["ENTRADA", "DEVOLUCAO"].includes(modalMov.tipo) ? "+" : ["SAIDA", "PERDA"].includes(modalMov.tipo) ? "-" : ""}{modalMov.quantidade}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-semibold">Data / Hora</p>
                  <p className="text-sm font-semibold text-slate-700">{new Date(modalMov.createdAt).toLocaleDateString("pt-BR")}</p>
                  <p className="text-xs text-slate-500">{new Date(modalMov.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</p>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Lote & Validade</p>
                <div className="bg-white border rounded-xl p-3 flex items-center gap-4">
                  {modalMov.lote ? (
                    <>
                      <div className="flex items-center gap-2">
                        <Hash className="h-4 w-4 text-slate-400" />
                        <div>
                          <p className="text-xs text-slate-400">Lote</p>
                          <p className="font-mono font-semibold text-slate-700">{modalMov.lote.numeroLote}</p>
                        </div>
                      </div>
                      <div className="w-px h-8 bg-slate-200" />
                      <div>
                        <p className="text-xs text-slate-400">Validade</p>
                        <p className="font-mono font-semibold text-slate-700">
                          {modalMov.lote.validade ? new Date(modalMov.lote.validade).toLocaleDateString("pt-BR") : "N/A"}
                        </p>
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-slate-400">Sem lote vinculado</p>
                  )}
                </div>
              </div>

              {modalMov.pedidoVenda && (
                <div className="space-y-2">
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Pedido Vinculado</p>
                  <div className="bg-white border rounded-xl p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-blue-500" />
                        <p className="font-mono font-bold text-blue-700 text-sm">#{modalMov.pedidoVenda.numero.slice(-8)}</p>
                      </div>
                      <Badge variant="outline" className={cn("text-[9px]",
                        modalMov.pedidoVenda.tipoPedido === "PEDIDO_NORMAL"
                          ? "bg-blue-50 text-blue-600"
                          : "bg-orange-50 text-orange-600"
                      )}>
                        {modalMov.pedidoVenda.tipoPedido === "PEDIDO_NORMAL" ? "PEDIDO COM NF" : "PEDIDO INTERNO"}
                      </Badge>
                    </div>
                    {modalMov.pedidoVenda.cliente && (
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <User className="h-3 w-3" />
                        <span>{modalMov.pedidoVenda.cliente.razaoSocial}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-semibold">Usuario</p>
                  <div className="flex items-center gap-2 mt-1">
                    <User className="h-4 w-4 text-slate-400" />
                    <span className="text-sm text-slate-700">{modalMov.usuarioRef?.nome || "Sistema"}</span>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-semibold">Empresa</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Building2 className="h-4 w-4 text-slate-400" />
                    <span className="text-sm text-slate-700">
                      {modalMov.empresaFiscal
                        ? modalMov.empresaFiscal.nomeFantasia || modalMov.empresaFiscal.razaoSocial
                        : "-"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-semibold">Origem</p>
                  <p className="text-sm text-slate-700">{modalMov.origem || "-"}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-semibold">Destino</p>
                  <p className="text-sm text-slate-700">{modalMov.destino || "-"}</p>
                </div>
              </div>

              {modalMov.movimentacaoFiscal?.documentoFiscal && (
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-semibold">Documento Fiscal</p>
                  <p className="text-sm text-slate-700">{modalMov.movimentacaoFiscal.documentoFiscal.numero}</p>
                </div>
              )}

              {modalMov.observacao && (
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-semibold">Observacao</p>
                  <div className="bg-slate-50 rounded-lg p-3 mt-1">
                    <p className="text-xs text-slate-600 italic">{modalMov.observacao}</p>
                  </div>
                </div>
              )}

              {modalMov.localizacao && (
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-semibold">Localizacao</p>
                  <p className="text-sm text-slate-700">{modalMov.localizacao.nome}</p>
                </div>
              )}

              {modalMov.estornado && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2 mt-4">
                  <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-amber-800">Entrada Estornada</p>
                    <p className="text-[11px] text-amber-600">Esta movimentação de entrada foi revertida e seu estoque foi baixado.</p>
                  </div>
                </div>
              )}

              {modalMov.isEstorno && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-start gap-2 mt-4">
                  <RotateCcw className="h-4 w-4 text-slate-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-slate-800">Movimentação de Estorno</p>
                    <p className="text-[11px] text-slate-500">Este é um ajuste automático para reverter uma entrada incorreta.</p>
                  </div>
                </div>
              )}

              {modalMov.tipo === "ENTRADA" && !modalMov.estornado && !modalMov.isEstorno && (
                <div className="flex flex-col gap-2 mt-6">
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1 h-9 gap-1.5 text-xs font-semibold border-amber-200 text-amber-700 hover:bg-amber-50"
                      onClick={() => openEditEntrada(modalMov)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Editar Entrada
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1 h-9 gap-1.5 text-xs font-semibold"
                      onClick={() => {
                        setHistoryMovId(modalMov.id);
                        setIsHistoryOpen(true);
                      }}
                    >
                      <History className="h-3.5 w-3.5" />
                      Histórico
                    </Button>
                  </div>
                  <Button
                    variant="destructive"
                    className="w-full h-9 gap-1.5 text-xs font-semibold"
                    onClick={() => handleEstornarClick(modalMov.id)}
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Estornar Entrada
                  </Button>
                </div>
              )}

              {/* History button for non-ENTRADA or estornado/isEstorno movements */}
              {(modalMov.tipo !== "ENTRADA" || modalMov.estornado || modalMov.isEstorno) && (
                <Button
                  variant="outline"
                  className="w-full mt-6 h-9 gap-1.5 text-xs font-semibold"
                  onClick={() => {
                    setHistoryMovId(modalMov.id);
                    setIsHistoryOpen(true);
                  }}
                >
                  <History className="h-3.5 w-3.5" />
                  Histórico
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <DialogContent className="sm:max-w-[420px] bg-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600 text-base">
              <AlertTriangle className="h-5 w-5" />
              Confirmar Estorno
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 pt-2 leading-relaxed">
              Tem certeza que deseja estornar esta entrada de estoque?
              <br /><br />
              Esta ação reduzirá a quantidade disponível do produto e lote correspondentes no estoque. Esta operação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsConfirmOpen(false)}
              disabled={isEstornando}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                if (movToEstornar !== null) {
                  confirmEstorno(movToEstornar);
                }
              }}
              disabled={isEstornando}
              className="gap-1.5 text-xs"
            >
              {isEstornando ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  Processando...
                </>
              ) : (
                "Confirmar Estorno"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Entrada Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={(open) => { if (!open) { setIsEditDialogOpen(false); setEditingMov(null); } }}>
        <DialogContent className="sm:max-w-[480px] bg-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Pencil className="h-4 w-4 text-amber-600" />
              Editar Movimentação de Entrada
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              {editingMov?.produto?.descricao || "Movimentação"} — Entrada #{editingMov?.id}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={salvarEdicaoEntrada} className="space-y-4 mt-2">
            {/* Quantidade */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Quantidade *</label>
              <Input
                type="number"
                step="0.001"
                min="0.001"
                value={editForm.quantidade}
                onChange={(e) => setEditForm({ ...editForm, quantidade: e.target.value })}
                className="h-9 text-sm"
                required
              />
            </div>

            {/* Observação */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Observação</label>
              <Textarea
                value={editForm.observacao}
                onChange={(e) => setEditForm({ ...editForm, observacao: e.target.value })}
                className="text-sm min-h-[60px] resize-none"
                placeholder="Observação da movimentação..."
              />
            </div>

            {/* Origem */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Origem</label>
              <Input
                type="text"
                value={editForm.origem}
                onChange={(e) => setEditForm({ ...editForm, origem: e.target.value })}
                className="h-9 text-sm"
                placeholder="Ex: Compra direta, Transferência..."
              />
            </div>

            {/* Motivo - amber card */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                <label className="text-xs font-semibold text-amber-800">
                  Motivo da Alteração *
                </label>
              </div>
              <Textarea
                value={editMotivo}
                onChange={(e) => setEditMotivo(e.target.value)}
                className="text-sm min-h-[60px] resize-none bg-white border-amber-200 focus:border-amber-400"
                placeholder="Descreva o motivo da alteração (mín. 5 caracteres)..."
              />
              <p className={cn(
                "text-[10px] text-right font-medium",
                editMotivo.trim().length >= 5 ? "text-emerald-600" : "text-amber-500"
              )}>
                {editMotivo.trim().length}/5 caracteres
              </p>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => { setIsEditDialogOpen(false); setEditingMov(null); }}
                disabled={savingEdit}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={savingEdit || editMotivo.trim().length < 5}
                className="gap-1.5 text-xs bg-amber-600 hover:bg-amber-700 text-white"
              >
                {savingEdit ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  "Salvar Alterações"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* History Sheet */}
      <Sheet open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
        <SheetContent className="max-w-2xl sm:max-w-2xl overflow-y-auto w-full md:w-[600px]">
          <SheetHeader className="mb-4">
            <SheetTitle className="flex items-center gap-2 text-lg">
              <History className="h-5 w-5 text-slate-600" />
              Histórico de Alterações
            </SheetTitle>
            <SheetDescription className="text-xs">
              Registro de todas as edições realizadas nesta movimentação.
            </SheetDescription>
          </SheetHeader>
          {historyMovId && (
            <div className="mt-2">
              <HistoricoAlteracoes entidade="movimentacao-estoque" entidadeId={historyMovId} />
            </div>
          )}
        </SheetContent>
      </Sheet>
    </main>
  );
}
