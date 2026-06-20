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
  TrendingUp,
  AlertOctagon,
  AlertTriangle,
  Award,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import {
  calcularMargemMedia,
  filtrarPorStatus,
  gerarCsvMargem,
  MargemProduto
} from "@/lib/utils/relatorios.utils";

const fetcher = (url: string) => fetch(url).then((r) => {
  if (!r.ok) throw new Error("Erro ao carregar dados de margem.");
  return r.json();
});

type SortKey = "margem" | "markup" | "lucroUnitario" | "precoVendaBase";

export default function MargemReportPage() {
  const { data, error, isLoading, mutate } = useSWR("/api/relatorios/margem", fetcher);
  const [search, setSearch] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<string>("todos");
  
  // Ordenação: padrão Margem crescente (asc)
  const [sortBy, setSortBy] = useState<SortKey>("margem");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const handleSort = (key: SortKey) => {
    if (sortBy === key) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(key);
      setSortOrder("asc");
    }
  };

  // Processamento de dados
  const processedData = useMemo(() => {
    if (!data) return [];
    
    // 1. Filtrar por busca (nome ou código)
    let items = data.filter((p: MargemProduto) => {
      const term = search.toLowerCase();
      return (
        p.descricao.toLowerCase().includes(term) ||
        (p.codigoInterno || "").toLowerCase().includes(term)
      );
    });

    // 2. Filtrar por status
    items = filtrarPorStatus(items, filtroStatus);

    // 3. Ordenar
    return [...items].sort((a: MargemProduto, b: MargemProduto) => {
      const aVal = a[sortBy] ?? 0;
      const bVal = b[sortBy] ?? 0;
      return sortOrder === "asc" ? aVal - bVal : bVal - aVal;
    });
  }, [data, search, filtroStatus, sortBy, sortOrder]);

  // KPIs
  const kpis = useMemo(() => {
    if (!data || data.length === 0) {
      return { margemMedia: 0, negativos: 0, baixas: 0, maiorMargem: null };
    }

    const margemMedia = calcularMargemMedia(data);
    const negativos = data.filter((p: MargemProduto) => p.status === "NEGATIVA").length;
    const baixas = data.filter((p: MargemProduto) => p.status === "BAIXA").length;

    // Encontra produto com maior margem
    let maior = data[0];
    data.forEach((p: MargemProduto) => {
      if (p.margem > maior.margem) {
        maior = p;
      }
    });

    return {
      margemMedia,
      negativos,
      baixas,
      maiorMargem: maior
    };
  }, [data]);

  const exportarCSV = () => {
    if (processedData.length === 0) {
      toast.error("Nenhum dado para exportar.");
      return;
    }
    const csvContent = gerarCsvMargem(processedData);
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const dataAtual = new Date().toISOString().split("T")[0];
    link.setAttribute("href", url);
    link.setAttribute("download", `margem_${dataAtual}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("CSV de margem exportado com sucesso.");
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "NEGATIVA":
        return "bg-red-100 text-red-700 border-red-200";
      case "BAIXA":
        return "bg-orange-100 text-orange-700 border-orange-200";
      case "NORMAL":
        return "bg-yellow-100 text-yellow-700 border-yellow-200";
      case "ALTA":
        return "bg-emerald-100 text-emerald-700 border-emerald-200";
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
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center space-y-4">
        <h1 className="text-2xl font-bold text-red-600">Erro ao carregar relatório de margem</h1>
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
            Relatório de Margem
          </h1>
          <p className="text-sm text-slate-500 mt-1">Análise de preços de venda, margem de contribuição e markup de produtos ativos.</p>
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

      {/* KPI CARDS (4 cards) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card Margem Média Geral */}
        <Card className="border-l-4 border-l-blue-500 shadow-sm border-slate-200">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg shrink-0">
              <TrendingUp className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Margem Média</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-0.5">{kpis.margemMedia}%</h3>
            </div>
          </CardContent>
        </Card>

        {/* Card Produtos com Margem Negativa */}
        <Card className={cn("border-l-4 border-l-red-500 shadow-sm border-slate-200", kpis.negativos > 0 && "bg-red-50/10")}>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-red-50 rounded-lg shrink-0">
              <AlertOctagon className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Margem Negativa</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <h3 className="text-2xl font-bold text-slate-900">{kpis.negativos}</h3>
                {kpis.negativos > 0 && (
                  <Badge className="bg-red-100 text-red-700 border-red-200 text-[10px] h-5">Alerta</Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card Produtos com Margem Baixa */}
        <Card className="border-l-4 border-l-orange-500 shadow-sm border-slate-200">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-orange-50 rounded-lg shrink-0">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Margem Baixa</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <h3 className="text-2xl font-bold text-slate-900">{kpis.baixas}</h3>
                {kpis.baixas > 0 && (
                  <Badge className="bg-orange-100 text-orange-700 border-orange-200 text-[10px] h-5">Atenção</Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card Maior Margem */}
        <Card className="border-l-4 border-l-emerald-500 shadow-sm border-slate-200">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-emerald-50 rounded-lg shrink-0">
              <Award className="h-5 w-5 text-emerald-600" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Maior Margem</p>
              {kpis.maiorMargem ? (
                <div className="mt-0.5">
                  <h3 className="text-xl font-bold text-emerald-700 truncate leading-none">
                    {kpis.maiorMargem.margem}%
                  </h3>
                  <p className="text-[9px] text-slate-500 truncate mt-0.5">{kpis.maiorMargem.descricao}</p>
                </div>
              ) : (
                <h3 className="text-2xl font-bold mt-0.5 text-slate-900">—</h3>
              )}
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
          {["todos", "NEGATIVA", "BAIXA", "NORMAL", "ALTA"].map((st) => (
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
              {st === "todos" ? "Todos os Status" : st}
            </button>
          ))}
        </div>
      </div>

      {/* TABELA PRINCIPAL */}
      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          {processedData.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <TrendingUp className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Nenhum produto atende aos filtros de busca e status.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase">Código</th>
                    <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase">Produto</th>
                    <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase">Categoria</th>
                    <th className="text-right px-4 py-3 text-xs font-bold text-slate-500 uppercase">Custo</th>
                    <th
                      className="text-right px-4 py-3 text-xs font-bold text-slate-500 uppercase cursor-pointer hover:bg-slate-100 group transition-colors"
                      onClick={() => handleSort("precoVendaBase")}
                    >
                      Preço Venda {renderSortIcon("precoVendaBase")}
                    </th>
                    <th
                      className="text-right px-4 py-3 text-xs font-bold text-slate-500 uppercase cursor-pointer hover:bg-slate-100 group transition-colors"
                      onClick={() => handleSort("lucroUnitario")}
                    >
                      Lucro Unit. {renderSortIcon("lucroUnitario")}
                    </th>
                    <th
                      className="text-right px-4 py-3 text-xs font-bold text-slate-500 uppercase cursor-pointer hover:bg-slate-100 group transition-colors"
                      onClick={() => handleSort("margem")}
                    >
                      Margem (%) {renderSortIcon("margem")}
                    </th>
                    <th
                      className="text-right px-4 py-3 text-xs font-bold text-slate-500 uppercase cursor-pointer hover:bg-slate-100 group transition-colors"
                      onClick={() => handleSort("markup")}
                    >
                      Markup (%) {renderSortIcon("markup")}
                    </th>
                    <th className="text-center px-4 py-3 text-xs font-bold text-slate-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {processedData.map((p) => {
                    const isNegativa = p.status === "NEGATIVA";
                    return (
                      <tr key={p.id} className={cn("hover:bg-slate-50/50 transition-colors", isNegativa && "bg-red-50/50 hover:bg-red-50")}>
                        <td className="px-4 py-3 font-mono text-xs text-slate-500">{p.codigoInterno || "—"}</td>
                        <td className="px-4 py-3 font-medium text-slate-800">{p.descricao}</td>
                        <td className="px-4 py-3 text-slate-500 text-xs">{p.categoria || "—"}</td>
                        <td className="px-4 py-3 text-right text-slate-600 font-mono text-xs">
                          R$ {p.precoCustoBase.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-600 font-mono text-xs">
                          R$ {p.precoVendaBase.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-slate-800 font-mono text-xs">
                          R$ {p.lucroUnitario.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-slate-800 font-mono text-xs">
                          {p.margem}%
                        </td>
                        <td className="px-4 py-3 text-right text-slate-600 font-mono text-xs">
                          {p.markup}%
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge variant="outline" className={cn("text-[10px] font-semibold", getStatusColor(p.status))}>
                            {p.status}
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
