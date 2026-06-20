"use client";

import { useState } from "react";
import useSWR from "swr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  Download,
  RefreshCw,
  Calendar,
  AlertTriangle,
  Clock,
  ShieldAlert,
  ArrowRight,
  Sparkles
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { calcularDiasRestantes } from "@/lib/utils/relatorios.utils";

const fetcher = (url: string) => fetch(url).then((r) => {
  if (!r.ok) throw new Error("Erro ao buscar alertas de validade.");
  return r.json();
});

export default function ValidadeReportPage() {
  const [dias, setDias] = useState<30 | 60 | 90>(30);
  const { data, error, isLoading, mutate } = useSWR(`/api/estoque/alertas?dias=${dias}`, fetcher);

  const getUrgencyBadge = (diasRestantes: number) => {
    if (diasRestantes <= 7) {
      return <Badge className="bg-red-100 text-red-700 border-red-200">Crítico ({diasRestantes}d)</Badge>;
    }
    if (diasRestantes <= 30) {
      return <Badge className="bg-orange-100 text-orange-700 border-orange-200">Urgente ({diasRestantes}d)</Badge>;
    }
    if (diasRestantes <= 60) {
      return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200 font-medium">Atenção ({diasRestantes}d)</Badge>;
    }
    return <Badge className="bg-slate-100 text-slate-700 border-slate-200">Sob controle ({diasRestantes}d)</Badge>;
  };

  const exportarCSV = () => {
    if (!data) return;

    let csv = "RELATORIO DE VALIDADE\n";
    csv += `Periodo;${dias} dias\n`;
    csv += `Lotes Vencidos;${data.vencidos.length}\n`;
    csv += `Lotes Vencendo;${data.vencendo.length}\n`;
    csv += `Valor em Risco;R$ ${data.valorEmRisco.toFixed(2)}\n\n`;

    csv += "LOTES VENCIDOS\n";
    csv += "Produto;Codigo;Lote;Validade;Dias Vencido;Quantidade;Localizacao\n";
    data.vencidos.forEach((v: any) => {
      const diasVencido = Math.abs(calcularDiasRestantes(v.validade));
      csv += `${v.produto};${v.codigo || ""};${v.numeroLote};${new Date(v.validade).toLocaleDateString("pt-BR")};${diasVencido};${v.quantidade};${v.localizacao}\n`;
    });
    csv += "\n";

    csv += "LOTES VENCENDO EM BREVE\n";
    csv += "Produto;Codigo;Lote;Validade;Dias Restantes;Quantidade;Localizacao\n";
    data.vencendo.forEach((v: any) => {
      const diasRestantes = calcularDiasRestantes(v.validade);
      csv += `${v.produto};${v.codigo || ""};${v.numeroLote};${new Date(v.validade).toLocaleDateString("pt-BR")};${diasRestantes};${v.quantidade};${v.localizacao}\n`;
    });

    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const dataAtual = new Date().toISOString().split("T")[0];
    link.setAttribute("href", url);
    link.setAttribute("download", `validade_${dataAtual}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("CSV de validade exportado com sucesso.");
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-[250px]" />
        <div className="grid grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
        <Skeleton className="h-[200px] w-full" />
        <Skeleton className="h-[200px] w-full" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 text-center space-y-4">
        <h1 className="text-2xl font-bold text-red-600">Erro ao carregar relatório de validade</h1>
        <p className="text-slate-500">{error?.message || "Tente novamente mais tarde."}</p>
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
            Relatório de Validade
          </h1>
          <p className="text-sm text-slate-500 mt-1">Gestão sanitária de lotes expirando ou vencidos no estoque disponível.</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {/* Seletor de período */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
            {([30, 60, 90] as const).map((v) => (
              <button
                key={v}
                onClick={() => setDias(v)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                  dias === v ? "bg-slate-900 text-white shadow-sm" : "text-slate-600 hover:bg-slate-200"
                )}
              >
                {v} dias
              </button>
            ))}
          </div>

          <Button variant="outline" size="sm" onClick={() => mutate()} className="h-9 text-xs">
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button onClick={exportarCSV} className="bg-slate-900 hover:bg-slate-800 text-white h-9 text-xs flex items-center gap-1.5 font-semibold">
            <Download className="h-4 w-4" /> Exportar CSV
          </Button>
        </div>
      </div>

      {/* KPI CARDS (3 cards) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card Lotes Vencendo */}
        <Card className="border-l-4 border-l-amber-500 shadow-sm border-slate-200">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-amber-50 rounded-lg shrink-0">
              <Clock className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Vencendo em {dias} dias</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-0.5">{data.vencendo.length} lotes</h3>
            </div>
          </CardContent>
        </Card>

        {/* Card Lotes Vencidos */}
        <Card className="border-l-4 border-l-red-500 shadow-sm border-slate-200">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-red-50 rounded-lg shrink-0">
              <ShieldAlert className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Lotes Vencidos</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <h3 className="text-2xl font-bold text-red-600">{data.vencidos.length}</h3>
                <Badge className="bg-red-100 text-red-700 border-red-200 text-[10px] h-5">Bloqueados</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card Valor em Risco */}
        <Card className="border-l-4 border-l-red-950 shadow-sm border-slate-200">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-red-950/10 rounded-lg shrink-0">
              <AlertTriangle className="h-5 w-5 text-red-950" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Valor em Risco</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <h3 className={cn("text-2xl font-bold mt-0.5", data.valorEmRisco > 0 ? "text-red-700" : "text-slate-900")}>
                  R$ {data.valorEmRisco.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </h3>
                {data.valorEmRisco > 0 && (
                  <Badge className="bg-red-950 text-red-100 border-red-900 text-[10px] h-5">Risco</Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* TABELA 1 — LOTES VENCIDOS (Ocultada se vazia, com mensagem de sucesso) */}
      <div className="space-y-3">
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-red-600" />
          Lotes Vencidos
          <Badge className="bg-red-100 text-red-700 border-red-200">{data.vencidos.length}</Badge>
        </h2>

        {data.vencidos.length === 0 ? (
          <Card className="border-slate-200 bg-emerald-50/20 shadow-sm border-emerald-100 p-6 text-center text-emerald-700 text-xs font-semibold flex items-center justify-center gap-2">
            <Sparkles className="h-4.5 w-4.5 text-emerald-500" />
            Nenhum lote vencido no período.
          </Card>
        ) : (
          <Card className="border-slate-200 shadow-sm overflow-hidden bg-red-50/10">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b">
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase">Produto</th>
                      <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase">Código</th>
                      <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase">Lote</th>
                      <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase">Validade</th>
                      <th className="text-right px-4 py-3 text-xs font-bold text-slate-500 uppercase">Dias Vencido</th>
                      <th className="text-right px-4 py-3 text-xs font-bold text-slate-500 uppercase">Qtd. Disponível</th>
                      <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase">Localização</th>
                      <th className="text-right px-4 py-3 text-xs font-bold text-slate-500 uppercase w-[140px]">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-red-100">
                    {data.vencidos.map((v: any) => {
                      const diasVencido = Math.abs(calcularDiasRestantes(v.validade));
                      return (
                        <tr key={v.loteId} className="hover:bg-red-50/30 bg-red-50/20 transition-colors">
                          <td className="px-4 py-3 font-semibold text-slate-900">{v.produto}</td>
                          <td className="px-4 py-3 font-mono text-xs text-slate-500">{v.codigo || "—"}</td>
                          <td className="px-4 py-3 font-mono text-xs font-bold text-slate-800">{v.numeroLote}</td>
                          <td className="px-4 py-3 text-red-600 font-semibold text-xs">
                            {new Date(v.validade).toLocaleDateString("pt-BR")}
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-red-700 text-xs">
                            Há {diasVencido} dias
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-slate-800">{v.quantidade}</td>
                          <td className="px-4 py-3 text-slate-500 text-xs">{v.localizacao}</td>
                          <td className="px-4 py-3 text-right">
                            <Link href={`/sistema/estoque/lotes/${v.loteId}`}>
                              <Button size="sm" variant="ghost" className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1 ml-auto">
                                Ver distribuição <ArrowRight className="h-3.5 w-3.5" />
                              </Button>
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* TABELA 2 — LOTES VENCENDO EM BREVE */}
      <div className="space-y-3 pt-2">
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <Clock className="h-5 w-5 text-amber-500" />
          Vencendo em Breve
          <Badge className="bg-amber-100 text-amber-700 border-amber-200">{data.vencendo.length}</Badge>
        </h2>

        {data.vencendo.length === 0 ? (
          <Card className="border-slate-200 shadow-sm p-8 text-center text-slate-400 text-xs">
            Nenhum lote com validade expirando no período selecionado.
          </Card>
        ) : (
          <Card className="border-slate-200 shadow-sm overflow-hidden">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b">
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase">Produto</th>
                      <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase">Código</th>
                      <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase">Lote</th>
                      <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase">Validade</th>
                      <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase w-[140px]">Dias Restantes</th>
                      <th className="text-right px-4 py-3 text-xs font-bold text-slate-500 uppercase">Qtd. Disponível</th>
                      <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase">Localização</th>
                      <th className="text-right px-4 py-3 text-xs font-bold text-slate-500 uppercase w-[140px]">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {data.vencendo.map((v: any) => {
                      const diasRestantes = calcularDiasRestantes(v.validade);
                      return (
                        <tr key={v.loteId} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-4 py-3 font-semibold text-slate-900">{v.produto}</td>
                          <td className="px-4 py-3 font-mono text-xs text-slate-500">{v.codigo || "—"}</td>
                          <td className="px-4 py-3 font-mono text-xs text-slate-700">{v.numeroLote}</td>
                          <td className="px-4 py-3 text-slate-600 text-xs">
                            {new Date(v.validade).toLocaleDateString("pt-BR")}
                          </td>
                          <td className="px-4 py-3">
                            {getUrgencyBadge(diasRestantes)}
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-slate-800">{v.quantidade}</td>
                          <td className="px-4 py-3 text-slate-500 text-xs">{v.localizacao}</td>
                          <td className="px-4 py-3 text-right">
                            <Link href={`/sistema/estoque/lotes/${v.loteId}`}>
                              <Button size="sm" variant="ghost" className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1 ml-auto">
                                Ver distribuição <ArrowRight className="h-3.5 w-3.5" />
                              </Button>
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
