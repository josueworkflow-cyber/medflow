"use client";
import { useEffect, useState } from "react";

type Giro = {
  id: number; codigoInterno: string | null; descricao: string;
  estoqueAtual: number; vendaMensal: number; diasCobertura: number;
  status: string;
};

const statusStyle: Record<string, string> = {
  SEM_ESTOQUE: "bg-gray-100 text-gray-700",
  CRITICO: "bg-red-100 text-red-700",
  BAIXO: "bg-amber-100 text-amber-700",
  NORMAL: "bg-green-100 text-green-700",
  EXCESSO: "bg-blue-100 text-blue-700",
};

const statusLabel: Record<string, string> = {
  SEM_ESTOQUE: "Sem estoque", CRITICO: "Crítico", BAIXO: "Baixo",
  NORMAL: "Normal", EXCESSO: "Excesso",
};

export default function GiroEstoquePage() {
  const [giro, setGiro] = useState<Giro[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/estoque/giro").then((r) => r.json()).then((d) => setGiro(Array.isArray(d) ? d : [])).finally(() => setLoading(false));
  }, []);

  return (
    <main className="p-6 space-y-6">
      <div><p className="text-sm text-slate-500">Estoque</p><h1 className="text-3xl font-semibold">Giro de Estoque Inteligente</h1>
        <p className="text-sm text-slate-400 mt-1">Análise de cobertura baseada nas vendas dos últimos 30 dias</p>
      </div>

      {loading ? <p className="text-slate-500">Carregando...</p> : giro.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center"><p className="text-slate-500">Nenhum produto com estoque ou vendas para análise.</p></div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-wrap gap-3">
            {["CRITICO", "BAIXO", "NORMAL", "EXCESSO"].map((s) => {
              const count = giro.filter((g) => g.status === s).length;
              return <span key={s} className={`px-3 py-1 rounded-full text-xs font-medium ${statusStyle[s]}`}>{statusLabel[s]}: {count}</span>;
            })}
          </div>
          <div className="overflow-x-auto"><table className="w-full text-sm">
            <thead className="text-left border-b text-xs text-slate-500"><tr><th className="py-2 px-3">Produto</th><th className="px-3">Venda média/mês</th><th className="px-3">Estoque atual</th><th className="px-3">Dias de cobertura</th><th className="px-3">Status</th></tr></thead>
            <tbody>{giro.map((g) => (
              <tr key={g.id} className="border-b hover:bg-slate-50">
                <td className="py-2 px-3"><span className="font-medium">{g.descricao}</span>{g.codigoInterno && <span className="ml-2 text-xs text-slate-400">{g.codigoInterno}</span>}</td>
                <td className="px-3">{g.vendaMensal}</td>
                <td className="px-3">{g.estoqueAtual}</td>
                <td className="px-3 font-semibold">{g.diasCobertura >= 999 ? "∞ (sem saída)" : `${g.diasCobertura} dias`}</td>
                <td className="px-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${statusStyle[g.status]}`}>{statusLabel[g.status]}</span></td>
              </tr>
            ))}</tbody>
          </table></div>
        </div>
      )}
    </main>
  );
}
