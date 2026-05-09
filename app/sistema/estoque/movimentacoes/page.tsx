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
  AlertTriangle, Layers, RotateCcw, Ban, Boxes,
} from "lucide-react";

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
                          <Badge className={cn("text-[9px] border", cfg.color)}>{cfg.label}</Badge>
                        </td>
                        <td className="px-3">
                          <span className={cn("font-bold text-xs",
                            isEntrada ? "text-emerald-600" : isSaida ? "text-red-600" : "text-slate-600"
                          )}>
                            {isEntrada ? "+" : isSaida ? "-" : ""}{mov.quantidade}
                          </span>
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
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
