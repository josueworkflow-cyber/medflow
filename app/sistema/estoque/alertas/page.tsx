"use client";
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";

type Alerta = { loteId: number; numeroLote: string; validade: string; produto: string; codigo: string | null; quantidade: number };
type EstoqueMin = { id: number; descricao: string; codigoInterno: string | null; estoqueMinimo: number; estoqueAtual: number; diferenca: number };
type AlertaData = {
  vencendo: Alerta[]; vencidos: Alerta[]; abaixoMinimo: EstoqueMin[];
  valorEmRisco: number; totais: { vencendo: number; vencidos: number; abaixoMinimo: number };
};

export default function AlertasEstoquePage() {
  const [data, setData] = useState<AlertaData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/estoque/alertas").then((r) => r.json()).then(setData).finally(() => setLoading(false));
  }, []);

  if (loading) return <main className="p-6"><h1 className="text-3xl font-semibold">Alertas de Estoque</h1><p className="text-slate-500 mt-4">Carregando...</p></main>;

  const d = data || { vencendo: [], vencidos: [], abaixoMinimo: [], valorEmRisco: 0, totais: { vencendo: 0, vencidos: 0, abaixoMinimo: 0 } };

  return (
    <main className="p-6 space-y-6">
      <div><p className="text-sm text-slate-500">Estoque</p><h1 className="text-3xl font-semibold">Alertas de Estoque</h1></div>
      <div className="grid md:grid-cols-4 gap-4">
        <Card className={d.totais.vencendo > 0 ? "border-amber-200" : ""}>
          <CardContent className="p-5"><p className="text-sm text-slate-500">⚠️ Próximos de vencer</p><h3 className={`text-2xl font-semibold mt-2 ${d.totais.vencendo > 0 ? "text-amber-600" : ""}`}>{d.totais.vencendo}</h3></CardContent>
        </Card>
        <Card className={d.totais.vencidos > 0 ? "border-red-200" : ""}>
          <CardContent className="p-5"><p className="text-sm text-slate-500">🚫 Vencidos</p><h3 className={`text-2xl font-semibold mt-2 ${d.totais.vencidos > 0 ? "text-red-600" : ""}`}>{d.totais.vencidos}</h3></CardContent>
        </Card>
        <Card className={d.totais.abaixoMinimo > 0 ? "border-orange-200" : ""}>
          <CardContent className="p-5"><p className="text-sm text-slate-500">📉 Abaixo do mínimo</p><h3 className={`text-2xl font-semibold mt-2 ${d.totais.abaixoMinimo > 0 ? "text-orange-600" : ""}`}>{d.totais.abaixoMinimo}</h3></CardContent>
        </Card>
        <Card className={d.valorEmRisco > 0 ? "border-red-200" : ""}>
          <CardContent className="p-5"><p className="text-sm text-slate-500">💰 Valor em risco</p><h3 className={`text-2xl font-semibold mt-2 ${d.valorEmRisco > 0 ? "text-red-600" : ""}`}>R$ {d.valorEmRisco.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</h3></CardContent>
        </Card>
      </div>

      {d.vencidos.length > 0 && (
        <Card className="border-red-200"><CardContent className="p-5">
          <h2 className="text-lg font-semibold text-red-700 mb-3">🚫 Lotes vencidos — Bloqueio automático recomendado</h2>
          <table className="w-full text-sm"><thead className="text-left border-b text-xs text-slate-500"><tr><th className="py-2">Produto</th><th>Lote</th><th>Validade</th><th>Qtd</th></tr></thead>
            <tbody>{d.vencidos.map((a) => (<tr key={a.loteId} className="border-b"><td className="py-2">{a.produto}</td><td>{a.numeroLote}</td><td className="text-red-600">{new Date(a.validade).toLocaleDateString("pt-BR")}</td><td>{a.quantidade}</td></tr>))}</tbody>
          </table>
        </CardContent></Card>
      )}

      {d.vencendo.length > 0 && (
        <Card className="border-amber-200"><CardContent className="p-5">
          <h2 className="text-lg font-semibold text-amber-700 mb-3">⚠️ Lotes próximos do vencimento (30 dias)</h2>
          <table className="w-full text-sm"><thead className="text-left border-b text-xs text-slate-500"><tr><th className="py-2">Produto</th><th>Lote</th><th>Validade</th><th>Qtd</th></tr></thead>
            <tbody>{d.vencendo.map((a) => (<tr key={a.loteId} className="border-b"><td className="py-2">{a.produto}</td><td>{a.numeroLote}</td><td className="text-amber-600">{new Date(a.validade).toLocaleDateString("pt-BR")}</td><td>{a.quantidade}</td></tr>))}</tbody>
          </table>
        </CardContent></Card>
      )}

      {d.abaixoMinimo.length > 0 && (
        <Card className="border-orange-200"><CardContent className="p-5">
          <h2 className="text-lg font-semibold text-orange-700 mb-3">📉 Produtos abaixo do estoque mínimo</h2>
          <table className="w-full text-sm"><thead className="text-left border-b text-xs text-slate-500"><tr><th className="py-2">Produto</th><th>Mínimo</th><th>Atual</th><th>Diferença</th></tr></thead>
            <tbody>{d.abaixoMinimo.map((a) => (<tr key={a.id} className="border-b"><td className="py-2">{a.descricao}</td><td>{a.estoqueMinimo}</td><td className="text-red-600 font-semibold">{a.estoqueAtual}</td><td className="text-red-600">{a.diferenca}</td></tr>))}</tbody>
          </table>
        </CardContent></Card>
      )}

      {d.totais.vencendo === 0 && d.totais.vencidos === 0 && d.totais.abaixoMinimo === 0 && (
        <Card><CardContent className="p-8 text-center"><p className="text-lg text-slate-500">✅ Nenhum alerta no momento. Tudo sob controle!</p></CardContent></Card>
      )}
    </main>
  );
}
