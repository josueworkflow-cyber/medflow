"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  TrendingUp, TrendingDown, DollarSign,
  ArrowUpRight, ArrowDownRight, Calendar,
  Clock, AlertTriangle, BarChart3,
} from "lucide-react";

type FluxoCaixa = {
  realizado: { entradas: number; saidas: number; resultado: number };
  previsto: { aReceber: number; aPagar: number; saldoProjetado: number };
  vencimento: { label: string; aReceber: number; qtdReceber: number; aPagar: number; qtdPagar: number; saldo: number }[];
};

const periodos = [
  { value: "hoje", label: "Hoje" },
  { value: "7", label: "7 dias" },
  { value: "15", label: "15 dias" },
  { value: "30", label: "30 dias" },
  { value: "mes", label: "Mes atual" },
  { value: "personalizado", label: "Personalizado" },
];

export default function FluxoCaixaPage() {
  const [data, setData] = useState<FluxoCaixa | null>(null);
  const [loading, setLoading] = useState(true);
  const [periodo, setPeriodo] = useState("30");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [showPeriodo, setShowPeriodo] = useState(false);

  function carregar(params?: Record<string, string>) {
    setLoading(true);
    const query = new URLSearchParams(
      params || (showPeriodo ? { dataInicio, dataFim } : { periodo })
    ).toString();
    fetch(`/api/financeiro/fluxo-caixa?${query}`)
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (showPeriodo && dataInicio && dataFim) {
      carregar({ dataInicio, dataFim });
    } else if (!showPeriodo) {
      carregar({ periodo });
    } else {
      carregar();
    }
  }, [periodo, showPeriodo]);

  function handleFiltro(v: string) {
    if (v === "personalizado") {
      setShowPeriodo(true);
      const hoje = new Date();
      const mesAtras = new Date(hoje); mesAtras.setMonth(mesAtras.getMonth() - 1);
      setDataInicio(mesAtras.toISOString().split("T")[0]);
      setDataFim(hoje.toISOString().split("T")[0]);
    } else {
      setShowPeriodo(false);
      setPeriodo(v);
    }
  }

  return (
    <main className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Fluxo de Caixa</h1>
        <p className="text-xs text-slate-500">Visao realizada e prevista do caixa da empresa</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {periodos.map((p) => (
          <button
            key={p.value}
            onClick={() => handleFiltro(p.value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              (p.value === "personalizado" ? showPeriodo : periodo === p.value)
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {showPeriodo && (
        <div className="flex items-center gap-3 bg-white rounded-xl border p-4">
          <Calendar className="h-5 w-5 text-slate-400" />
          <Input type="date" className="w-48 text-sm" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
          <span className="text-slate-400">ate</span>
          <Input type="date" className="w-48 text-sm" value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
          <Button size="sm" className="bg-slate-900 hover:bg-slate-800 text-xs" onClick={() => carregar({ dataInicio, dataFim })}>
            Aplicar
          </Button>
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          <div className="grid md:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}
          </div>
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      ) : data ? (
        <div className="space-y-6">
          <div className="grid md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-500 flex items-center gap-2">
                  <ArrowDownRight className="h-4 w-4 text-emerald-600" />
                  Entradas Recebidas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-emerald-700">
                  R$ {data.realizado.entradas.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-500 flex items-center gap-2">
                  <ArrowUpRight className="h-4 w-4 text-red-600" />
                  Saidas Pagas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-red-700">
                  R$ {data.realizado.saidas.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-500 flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-blue-600" />
                  Resultado Realizado
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className={`text-2xl font-bold ${data.realizado.resultado >= 0 ? "text-blue-700" : "text-red-700"}`}>
                  R$ {data.realizado.resultado.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <Card className="border border-dashed border-slate-300">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-500 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-blue-600" />
                  Contas a Receber em Aberto
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-blue-700">
                  R$ {data.previsto.aReceber.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-slate-400 mt-1">Previsto</p>
              </CardContent>
            </Card>
            <Card className="border border-dashed border-slate-300">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-500 flex items-center gap-2">
                  <TrendingDown className="h-4 w-4 text-red-600" />
                  Contas a Pagar em Aberto
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-red-700">
                  R$ {data.previsto.aPagar.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-slate-400 mt-1">Previsto</p>
              </CardContent>
            </Card>
            <Card className="border border-dashed border-slate-300">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-500 flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-indigo-600" />
                  Saldo Projetado
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className={`text-2xl font-bold ${data.previsto.saldoProjetado >= 0 ? "text-indigo-700" : "text-red-700"}`}>
                  R$ {data.previsto.saldoProjetado.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-slate-400 mt-1">Previsto ate o fim do periodo</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-5 w-5 text-slate-600" />
                Visao por Vencimento
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left border-b text-xs text-slate-500 bg-slate-50">
                    <tr>
                      <th className="py-3 px-4">Faixa</th>
                      <th className="px-4">A Receber</th>
                      <th className="px-4">Qtd</th>
                      <th className="px-4">A Pagar</th>
                      <th className="px-4">Qtd</th>
                      <th className="px-4">Saldo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {data.vencimento.map((v) => (
                      <tr key={v.label} className="hover:bg-slate-50/50">
                        <td className="py-3 px-4">
                          <span className={`font-medium ${
                            v.label === "Vencido" && v.aReceber + v.aPagar > 0 ? "text-red-600" :
                            v.label === "Vence hoje" ? "text-amber-600" : "text-slate-700"
                          }`}>
                            {v.label === "Vencido" && v.aReceber + v.aPagar > 0 && <AlertTriangle className="h-3 w-3 inline mr-1" />}
                            {v.label}
                          </span>
                        </td>
                        <td className="px-4 text-emerald-700 font-semibold">
                          {v.aReceber > 0 ? `R$ ${v.aReceber.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "-"}
                        </td>
                        <td className="px-4 text-slate-500">{v.qtdReceber || "-"}</td>
                        <td className="px-4 text-red-600 font-semibold">
                          {v.aPagar > 0 ? `R$ ${v.aPagar.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "-"}
                        </td>
                        <td className="px-4 text-slate-500">{v.qtdPagar || "-"}</td>
                        <td className={`px-4 font-semibold ${v.saldo >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                          R$ {v.saldo.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="text-center py-16 text-slate-400">
          <BarChart3 className="h-12 w-12 mx-auto mb-3 text-slate-300" />
          <p className="text-sm">Selecione um periodo para visualizar o fluxo de caixa.</p>
        </div>
      )}
    </main>
  );
}
