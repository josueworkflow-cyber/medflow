"use client";
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";

type Alerta = { loteId: number; numeroLote: string; validade: string; produto: string; codigo: string | null; quantidade: number };
type AlertaData = {
  vencendo: Alerta[]; vencidos: Alerta[];
  valorEmRisco: number; totais: { vencendo: number; vencidos: number };
};

export default function ValidadePage() {
  const [data, setData] = useState<AlertaData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/relatorios/validade").then((r) => r.json()).then(setData).finally(() => setLoading(false));
  }, []);

  if (loading) return <main className="p-6"><h1 className="text-3xl font-semibold">Controle de Validade</h1><p className="text-slate-500 mt-4">Carregando...</p></main>;
  const d = data || { vencendo: [], vencidos: [], valorEmRisco: 0, totais: { vencendo: 0, vencidos: 0 } };

  return (
    <main className="p-6 space-y-6">
      <div><p className="text-sm text-slate-500">Relatórios</p><h1 className="text-3xl font-semibold">Controle Estratégico de Validade</h1>
        <p className="text-sm text-slate-400 mt-1">Gestão especializada para produtos de saúde — FEFO (First Expire, First Out)</p>
      </div>
      <div className="grid md:grid-cols-3 gap-4">
        <Card className={d.totais.vencendo > 0 ? "border-amber-300" : ""}><CardContent className="p-5"><p className="text-sm text-slate-500">⚠️ Próximos de vencer</p><h3 className={`text-2xl font-semibold mt-2 ${d.totais.vencendo > 0 ? "text-amber-600" : ""}`}>{d.totais.vencendo} lotes</h3><p className="text-xs text-slate-400 mt-1">Próximos 30 dias — Priorizar venda</p></CardContent></Card>
        <Card className={d.totais.vencidos > 0 ? "border-red-300" : ""}><CardContent className="p-5"><p className="text-sm text-slate-500">🚫 Vencidos</p><h3 className={`text-2xl font-semibold mt-2 ${d.totais.vencidos > 0 ? "text-red-600" : ""}`}>{d.totais.vencidos} lotes</h3><p className="text-xs text-slate-400 mt-1">Bloquear venda imediatamente</p></CardContent></Card>
        <Card className={d.valorEmRisco > 0 ? "border-red-300" : ""}><CardContent className="p-5"><p className="text-sm text-slate-500">💰 Valor financeiro em risco</p><h3 className={`text-2xl font-semibold mt-2 ${d.valorEmRisco > 0 ? "text-red-600" : ""}`}>R$ {d.valorEmRisco.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</h3><p className="text-xs text-slate-400 mt-1">Custo dos produtos vencidos</p></CardContent></Card>
      </div>

      {d.vencendo.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-5">
          <h2 className="text-lg font-semibold text-amber-800 mb-1">⚠️ Ação recomendada: Promoção para giro rápido</h2>
          <p className="text-sm text-amber-700 mb-4">Estes lotes vencem nos próximos 30 dias. Considere reduzir preço para acelerar a venda.</p>
          <table className="w-full text-sm bg-white rounded-xl overflow-hidden"><thead className="text-left border-b text-xs text-slate-500"><tr><th className="py-2 px-3">Produto</th><th className="px-3">Lote</th><th className="px-3">Validade</th><th className="px-3">Qtd em estoque</th><th className="px-3">Dias restantes</th></tr></thead>
          <tbody>{d.vencendo.map((a) => {
            const dias = Math.ceil((new Date(a.validade).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
            return (<tr key={a.loteId} className="border-b"><td className="py-2 px-3">{a.produto}</td><td className="px-3">{a.numeroLote}</td><td className="px-3 text-amber-700 font-medium">{new Date(a.validade).toLocaleDateString("pt-BR")}</td><td className="px-3">{a.quantidade}</td><td className={`px-3 font-semibold ${dias <= 7 ? "text-red-600" : "text-amber-600"}`}>{dias} dias</td></tr>);
          })}</tbody></table>
        </div>
      )}

      {d.vencidos.length > 0 && (
        <div className="rounded-2xl border border-red-200 bg-red-50/50 p-5">
          <h2 className="text-lg font-semibold text-red-800 mb-1">🚫 Ação obrigatória: Bloqueio de venda</h2>
          <p className="text-sm text-red-700 mb-4">Estes lotes estão vencidos e devem ser bloqueados para venda. Considerar descarte conforme normativa ANVISA.</p>
          <table className="w-full text-sm bg-white rounded-xl overflow-hidden"><thead className="text-left border-b text-xs text-slate-500"><tr><th className="py-2 px-3">Produto</th><th className="px-3">Lote</th><th className="px-3">Vencido em</th><th className="px-3">Qtd</th></tr></thead>
          <tbody>{d.vencidos.map((a) => (<tr key={a.loteId} className="border-b"><td className="py-2 px-3">{a.produto}</td><td className="px-3">{a.numeroLote}</td><td className="px-3 text-red-600 font-medium">{new Date(a.validade).toLocaleDateString("pt-BR")}</td><td className="px-3">{a.quantidade}</td></tr>))}</tbody>
          </table>
        </div>
      )}

      {d.totais.vencendo === 0 && d.totais.vencidos === 0 && (
        <Card><CardContent className="p-8 text-center"><p className="text-lg text-green-600 font-medium">✅ Nenhum problema de validade. Todos os lotes estão dentro da validade!</p></CardContent></Card>
      )}
    </main>
  );
}
