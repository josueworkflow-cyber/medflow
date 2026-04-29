"use client";
import { useEffect, useState } from "react";

type Margem = {
  id: number; codigoInterno: string | null; descricao: string; categoria: string | null;
  precoCustoBase: number; precoVendaBase: number; margem: number; markup: number;
  lucroUnitario: number; status: string;
};

const statusStyle: Record<string, string> = {
  NEGATIVA: "bg-red-100 text-red-700", BAIXA: "bg-amber-100 text-amber-700",
  NORMAL: "bg-green-100 text-green-700", ALTA: "bg-blue-100 text-blue-700",
};

export default function MargemPage() {
  const [margens, setMargens] = useState<Margem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/relatorios/margem").then((r) => r.json()).then((d) => setMargens(Array.isArray(d) ? d : [])).finally(() => setLoading(false));
  }, []);

  const negativas = margens.filter((m) => m.status === "NEGATIVA").length;
  const mediaGeral = margens.length > 0 ? (margens.reduce((s, m) => s + m.margem, 0) / margens.length).toFixed(1) : "0";

  return (
    <main className="p-6 space-y-6">
      <div><p className="text-sm text-slate-500">Relatórios</p><h1 className="text-3xl font-semibold">Inteligência de Preço e Margem</h1>
        <p className="text-sm text-slate-400 mt-1">Análise de margem, markup e lucro por produto</p>
      </div>
      <div className="flex flex-wrap gap-4">
        <div className="rounded-2xl border bg-white p-4 shadow-sm"><p className="text-xs text-slate-500">Margem média</p><p className="text-xl font-semibold">{mediaGeral}%</p></div>
        <div className="rounded-2xl border bg-white p-4 shadow-sm"><p className="text-xs text-slate-500">Produtos analisados</p><p className="text-xl font-semibold">{margens.length}</p></div>
        {negativas > 0 && <div className="rounded-2xl border border-red-200 bg-red-50 p-4 shadow-sm"><p className="text-xs text-red-600">⚠️ Margem negativa</p><p className="text-xl font-semibold text-red-700">{negativas} produtos</p></div>}
      </div>
      {loading ? <p className="text-slate-500">Carregando...</p> : margens.length === 0 ? (
        <div className="rounded-2xl border bg-white p-8 text-center"><p className="text-slate-500">Cadastre produtos com preço de custo e venda para ver a análise.</p></div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm overflow-x-auto">
          <table className="w-full text-sm"><thead className="text-left border-b text-xs text-slate-500"><tr>
            <th className="py-2 px-3">Produto</th><th className="px-3">Categoria</th><th className="px-3">Custo</th>
            <th className="px-3">Venda</th><th className="px-3">Lucro/un</th><th className="px-3">Margem</th>
            <th className="px-3">Markup</th><th className="px-3">Status</th>
          </tr></thead>
          <tbody>{margens.map((m) => (
            <tr key={m.id} className="border-b hover:bg-slate-50">
              <td className="py-2 px-3 font-medium">{m.descricao}</td>
              <td className="px-3 text-slate-500">{m.categoria || "—"}</td>
              <td className="px-3">R$ {m.precoCustoBase.toFixed(2)}</td>
              <td className="px-3">R$ {m.precoVendaBase.toFixed(2)}</td>
              <td className={`px-3 font-semibold ${m.lucroUnitario < 0 ? "text-red-600" : "text-green-600"}`}>R$ {m.lucroUnitario.toFixed(2)}</td>
              <td className={`px-3 font-semibold ${m.margem < 0 ? "text-red-600" : ""}`}>{m.margem}%</td>
              <td className="px-3">{m.markup}%</td>
              <td className="px-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${statusStyle[m.status]}`}>{m.status}</span></td>
            </tr>
          ))}</tbody></table>
        </div>
      )}
    </main>
  );
}
