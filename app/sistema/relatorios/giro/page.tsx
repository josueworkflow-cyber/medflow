"use client";

import { useState, useMemo } from "react";
import useSWR from "swr";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  Download,
  Search,
  RefreshCw,
  Boxes,
  XCircle,
  AlertTriangle,
  Clock,
  Compass,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import {
  formatarDiasCobertura,
  filtrarPorStatus
} from "@/lib/utils/relatorios.utils";

const fetcher = (url: string) => fetch(url).then((r) => {
  if (!r.ok) throw new Error("Erro ao carregar dados de giro de estoque.");
  return r.json();
});

type SortKey = "diasCobertura" | "estoqueAtual" | "vendaMensal";

export default function GiroReportPage() {
  const { data, error, isLoading, mutate } = useSWR("/api/estoque/giro", fetcher);
  const [search, setSearch] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<string>("todos");
  
  // Ordenação: padrão Dias de Cobertura crescente (asc)
  const [sortBy, setSortBy] = useState<SortKey>("diasCobertura");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const handleSort = (key: SortKey) => {
    if (sortBy === key) {
      setSortBy(key);
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(key);
      setSortOrder("asc");
    }
  };

  // Processamento de dados
  const processedData = useMemo(() => {
    if (!data) return [];

    let items = data.filter((p: any) => {
      const term = search.toLowerCase();
      return (
        p.descricao.toLowerCase().includes(term) ||
        (p.codigoInterno || "").toLowerCase().includes(term)
      );
    });

    items = filtrarPorStatus(items, filtroStatus);

    return [...items].sort((a: any, b: any) => {
      const aVal = a[sortBy] ?? 0;
      const bVal = b[sortBy] ?? 0;
      return sortOrder === "asc" ? aVal - bVal : bVal - aVal;
    });
  }, [data, search, filtroStatus, sortBy, sortOrder]);

  // KPIs
  const kpis = useMemo(() => {
    if (!data || data.length === 0) {
      return { total: 0, semEstoque: 0, critico: 0, excesso: 0, coberturaMedia: 0 };
    }

    const total = data.length;
    const semEstoque = data.filter((p: any) => p.status === "SEM_ESTOQUE").length;
    const critico = data.filter((p: any) => p.status === "CRITICO").length;
    const excesso = data.filter((p: any) => p.status === "EXCESSO").length;

    // Média de cobertura em dias (excluindo cobertura 999)
    const validItems = data.filter((p: any) => p.diasCobertura !== 999);
    const coberturaMedia = validItems.length > 0
      ? Math.round(validItems.reduce((s: number, p: any) => s + p.diasCobertura, 0) / validItems.length)
      : 0;

    return {
      total,
      semEstoque,
      critico,
      excesso,
      coberturaMedia
    };
  }, [data]);

  const exportarCSV = () => {
    if (processedData.length === 0) {
      toast.error("Nenhum dado para exportar.");
      return;
    }
    
    let csv = "Codigo;Produto;Estoque Atual;Venda Mensal (30 dias);Dias de Cobertura;Status\n";
    processedData.forEach((p: any) => {
      const coberturaStr = p.diasCobertura === 999 ? "Sem vendas" : String(p.diasCobertura);
      csv += `${p.codigoInterno || ""};${p.descricao};${p.estoqueAtual};${p.vendaMensal};${coberturaStr};${p.status}\n`;
    });

    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const dataAtual = new Date().toISOString().split("T")[0];
    link.setAttribute("href", url);
    link.setAttribute("download", `giro_${dataAtual}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("CSV de giro exportado com sucesso.");
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "SEM_ESTOQUE":
        return "bg-red-950 text-red-100 border-red-900"; // Dark red
      case "CRITICO":
        return "bg-red-100 text-red-700 border-red-200";
      case "BAIXO":
        return "bg-orange-100 text-orange-700 border-orange-200";
      case "NORMAL":
        return "bg-emerald-100 text-emerald-700 border-emerald-200";
      case "EXCESSO":
        return "bg-blue-100 text-blue-700 border-blue-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  const renderSortIcon = (key: SortKey) => {
    if (sortBy !== key) return <ArrowUpDown className="h-3.5 w-3.5 ml-1 inline opacity-40 group-hover:opacity-100" />;
    return sortOrder === "asc"
      ? <ArrowUp className="h-3.5 w-3.5 ml-1 inline text-slate-800" />
      : <ArrowDown className="h-3.5 w-3.5 ml-1 inline text-slate-800" />;
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-[250px]" />
        <div className="grid grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center space-y-4">
        <h1 className="text-2xl font-bold text-red-600">Erro ao carregar relatório de giro</h1>
        <p className="text-slate-500">{error.message || "Tente novamente mais tarde."}</p>
        <Link href="/sistema/relatorios">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 space-y-6">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <Link href="/sistema/relatorios" className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 transition-colors">
            <ArrowLeft className="h-4 w-4" /> Voltar para Relatórios
          </Link>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
            Relatório de Giro de Estoque
          </h1>
          <p className="text-sm text-slate-500 mt-1">Análise de velocidade de saídas e dias de cobertura estimada do estoque atual.</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={() => mutate()} className="h-9 text-xs">
            <RefreshCw className="h-4 w-4 mr-2" /> Atualizar
          </Button>
          <Button onClick={exportarCSV} className="bg-slate-900 hover:bg-slate-800 text-white h-9 text-xs flex items-center gap-1.5 font-semibold">
            <Download className="h-4 w-4" /> Exportar CSV
          </Button>
        </div>
      </div>

      {/* KPI CARDS (5 cards) */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Card Total Monitorados */}
        <Card className="border-l-4 border-l-slate-500 shadow-sm border-slate-200">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-slate-50 rounded-lg shrink-0">
              <Boxes className="h-5 w-5 text-slate-600" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Monitorados</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-0.5">{kpis.total} SKUs</h3>
            </div>
          </CardContent>
        </Card>

        {/* Card Sem Estoque */}
        <Card className={cn("border-l-4 border-l-red-950 shadow-sm border-slate-200", kpis.semEstoque > 0 && "bg-red-50/10")}>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-red-950/10 rounded-lg shrink-0">
              <XCircle className="h-5 w-5 text-red-950" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Sem Estoque</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <h3 className="text-2xl font-bold text-slate-900">{kpis.semEstoque}</h3>
                {kpis.semEstoque > 0 && (
                  <Badge className="bg-red-950 text-red-100 border-red-900 text-[10px] h-5">Zerar</Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card Crítico */}
        <Card className="border-l-4 border-l-red-500 shadow-sm border-slate-200">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-red-50 rounded-lg shrink-0">
              <AlertTriangle className="h-5 w-5 text-red-500" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Crítico (≤7d)</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <h3 className="text-2xl font-bold text-slate-900">{kpis.critico}</h3>
                {kpis.critico > 0 && (
                  <Badge className="bg-red-100 text-red-600 border-red-200 text-[10px] h-5">Urgente</Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card Cobertura Média */}
        <Card className="border-l-4 border-l-emerald-500 shadow-sm border-slate-200">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-emerald-50 rounded-lg shrink-0">
              <Clock className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Cobertura Média</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-0.5">{kpis.coberturaMedia} dias</h3>
            </div>
          </CardContent>
        </Card>

        {/* Card Excesso */}
        <Card className="border-l-4 border-l-blue-500 shadow-sm border-slate-200">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg shrink-0">
              <Compass className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Em Excesso (&gt;90d)</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <h3 className="text-2xl font-bold text-slate-900">{kpis.excesso}</h3>
                {kpis.excesso > 0 && (
                  <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-[10px] h-5">Excesso</Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* FILTROS CLIENT-SIDE */}
      <div className="flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full md:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Buscar por descrição ou código..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>
        <div className="flex gap-1.5 overflow-x-auto w-full md:w-auto">
          {["todos", "SEM_ESTOQUE", "CRITICO", "BAIXO", "NORMAL", "EXCESSO"].map((st) => (
            <button
              key={st}
              onClick={() => setFiltroStatus(st)}
              className={cn(
                "px-3 py-1.5 text-xs font-semibold rounded-full border transition-all whitespace-nowrap",
                filtroStatus === st
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
              )}
            >
              {st === "todos" ? "Todos os Status" : st === "SEM_ESTOQUE" ? "Sem Estoque" : st === "CRITICO" ? "Crítico" : st === "BAIXO" ? "Baixo" : st === "NORMAL" ? "Normal" : "Excesso"}
            </button>
          ))}
        </div>
      </div>

      {/* TABELA PRINCIPAL */}
      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          {processedData.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <Boxes className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Nenhum produto atende aos filtros de busca e status.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase">Código</th>
                    <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase">Produto</th>
                    <th
                      className="text-right px-4 py-3 text-xs font-bold text-slate-500 uppercase cursor-pointer hover:bg-slate-100 group transition-colors"
                      onClick={() => handleSort("estoqueAtual")}
                    >
                      Estoque Atual {renderSortIcon("estoqueAtual")}
                    </th>
                    <th
                      className="text-right px-4 py-3 text-xs font-bold text-slate-500 uppercase cursor-pointer hover:bg-slate-100 group transition-colors"
                      onClick={() => handleSort("vendaMensal")}
                    >
                      Venda Mensal (30 dias) {renderSortIcon("vendaMensal")}
                    </th>
                    <th
                      className="text-right px-4 py-3 text-xs font-bold text-slate-500 uppercase cursor-pointer hover:bg-slate-100 group transition-colors"
                      onClick={() => handleSort("diasCobertura")}
                    >
                      Dias de Cobertura {renderSortIcon("diasCobertura")}
                    </th>
                    <th className="text-center px-4 py-3 text-xs font-bold text-slate-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {processedData.map((p) => {
                    return (
                      <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-3 font-mono text-xs text-slate-500">{p.codigoInterno || "—"}</td>
                        <td className="px-4 py-3 font-medium text-slate-800">{p.descricao}</td>
                        <td className="px-4 py-3 text-right font-bold text-slate-800 font-mono text-xs">
                          {p.estoqueAtual}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-600 font-mono text-xs">
                          {p.vendaMensal}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-slate-800 font-mono text-xs">
                          {formatarDiasCobertura(p.diasCobertura)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge variant="outline" className={cn("text-[10px] font-semibold", getStatusColor(p.status))}>
                            {p.status === "SEM_ESTOQUE" ? "Sem Estoque" : p.status === "CRITICO" ? "Crítico" : p.status === "BAIXO" ? "Baixo" : p.status === "NORMAL" ? "Normal" : "Excesso"}
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
