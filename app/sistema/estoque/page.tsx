"use client";

import { useState } from "react";
import useSWR from "swr";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  Package, AlertTriangle, Search, RefreshCw, Boxes, XCircle,
} from "lucide-react";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type ProdutoResumo = {
  id: number; codigoInterno: string | null; descricao: string; categoria: string;
  qtdDisponivel: number; qtdReservada: number; qtdTotal: number;
  estoqueMinimo: number; percentual: number; status: "OK" | "CRITICO" | "ESGOTADO";
};

export default function EstoquePage() {
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<"TODOS" | "OK" | "CRITICO" | "ESGOTADO">("TODOS");

  const { data, isLoading, mutate } = useSWR("/api/estoque/produtos-resumo", fetcher);

  const produtos: ProdutoResumo[] = data?.produtos || [];
  const kpis = data?.kpis || { totalSKUs: 0, totalItens: 0, criticos: 0, esgotados: 0 };

  const filtrados = produtos.filter((p) => {
    if (filtroStatus !== "TODOS" && p.status !== filtroStatus) return false;
    if (busca) {
      const t = busca.toLowerCase();
      return p.descricao.toLowerCase().includes(t) ||
        (p.codigoInterno || "").toLowerCase().includes(t) ||
        p.categoria.toLowerCase().includes(t);
    }
    return true;
  });

  const statusConfig = {
    OK: { label: "OK", color: "bg-emerald-100 text-emerald-700 border-emerald-200", bar: "bg-emerald-500" },
    CRITICO: { label: "Crítico", color: "bg-red-100 text-red-700 border-red-200", bar: "bg-red-500" },
    ESGOTADO: { label: "Esgotado", color: "bg-slate-200 text-slate-600 border-slate-300", bar: "bg-slate-400" },
  };

  return (
    <div className="flex-1 p-4 space-y-5">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Visão Geral do Estoque</h1>
          <p className="text-xs text-slate-500">Detalhamento completo por produto</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => mutate()} className="h-8 text-xs">
          <RefreshCw className="h-3 w-3 mr-1" /> Atualizar
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg"><Boxes className="h-5 w-5 text-blue-600" /></div>
            <div>
              <p className="text-[10px] font-medium text-slate-500 uppercase">SKUs Ativos</p>
              <p className="text-xl font-bold">{kpis.totalSKUs}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-emerald-50 rounded-lg"><Package className="h-5 w-5 text-emerald-600" /></div>
            <div>
              <p className="text-[10px] font-medium text-slate-500 uppercase">Total Itens</p>
              <p className="text-xl font-bold">{kpis.totalItens.toLocaleString("pt-BR")}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-red-500">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-red-50 rounded-lg"><AlertTriangle className="h-5 w-5 text-red-600" /></div>
            <div>
              <p className="text-[10px] font-medium text-slate-500 uppercase">Críticos</p>
              <p className="text-xl font-bold text-red-600">{kpis.criticos}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-slate-400">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-slate-100 rounded-lg"><XCircle className="h-5 w-5 text-slate-500" /></div>
            <div>
              <p className="text-[10px] font-medium text-slate-500 uppercase">Esgotados</p>
              <p className="text-xl font-bold">{kpis.esgotados}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* FILTERS */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input placeholder="Buscar por nome, código ou categoria..." value={busca} onChange={(e) => setBusca(e.target.value)}
            className="pl-9 h-9 text-sm" />
        </div>
        <div className="flex gap-1">
          {(["TODOS", "OK", "CRITICO", "ESGOTADO"] as const).map((s) => (
            <button key={s} onClick={() => setFiltroStatus(s)}
              className={cn("px-3 py-1.5 text-xs font-semibold rounded-full transition-all",
                filtroStatus === s ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
              )}>
              {s === "TODOS" ? "Todos" : s === "CRITICO" ? "Críticos" : s === "ESGOTADO" ? "Esgotados" : "OK"}
            </button>
          ))}
        </div>
      </div>

      {/* TABLE */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">{[...Array(8)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : filtrados.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <Package className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Nenhum produto encontrado</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Código</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Produto</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Categoria</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Qtd Atual</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Est. Mín</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase w-[160px]">Nível</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filtrados.map((p) => {
                    const cfg = statusConfig[p.status];
                    const barPct = Math.min(p.percentual, 100);
                    const barColor = p.percentual > 50 ? "bg-emerald-500" : p.percentual > 20 ? "bg-amber-500" : p.percentual > 0 ? "bg-red-500" : "bg-slate-300";

                    return (
                      <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-3 font-mono text-xs text-slate-500">{p.codigoInterno || "-"}</td>
                        <td className="px-4 py-3 font-medium text-slate-800">{p.descricao}</td>
                        <td className="px-4 py-3 text-slate-500 text-xs">{p.categoria}</td>
                        <td className="px-4 py-3 text-right">
                          <span className="font-bold text-slate-800">{p.qtdTotal}</span>
                          {p.qtdReservada > 0 && (
                            <span className="text-[10px] text-amber-500 ml-1">({p.qtdReservada} res.)</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-500">{p.estoqueMinimo}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div className={cn("h-full rounded-full transition-all", barColor)}
                                style={{ width: `${barPct}%` }} />
                            </div>
                            <span className="text-[10px] font-semibold text-slate-500 w-8 text-right">
                              {barPct.toFixed(0)}%
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge variant="outline" className={cn("text-[10px] font-semibold", cfg.color)}>
                            {cfg.label}
                          </Badge>
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
    </div>
  );
}