"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";

export default function ContabilidadePage() {
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleExport() {
    if (!dataInicio || !dataFim) {
      alert("Selecione o período!");
      return;
    }
    
    setLoading(true);
    setError("");

    try {
      // Simulação de exportação SPED / Contábil
      // Em produção, isso bateria numa API que geraria um CSV/TXT
      const res = await fetch(`/api/financeiro/exportar?inicio=${dataInicio}&fim=${dataFim}`);
      if (!res.ok) throw new Error("Erro ao gerar arquivo.");
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Exportacao_Contabil_${dataInicio}_a_${dataFim}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err: any) {
      setError(err.message || "Erro ao exportar dados.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="p-6 space-y-6">
      <div>
        <p className="text-sm text-slate-500">Financeiro</p>
        <h1 className="text-3xl font-semibold text-slate-900">Integração Contábil & SPED</h1>
        <p className="text-sm text-slate-400 mt-1">Gere arquivos para integração com softwares de contabilidade e obrigações fiscais</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold mb-4">Exportação de Movimento</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-500 uppercase">Data Início</label>
                  <input type="date" className="w-full rounded-xl border border-slate-200 px-4 py-2" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-500 uppercase">Data Fim</label>
                  <input type="date" className="w-full rounded-xl border border-slate-200 px-4 py-2" value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
                </div>
              </div>

              <div className="space-y-2">
                <label className="mb-1 block text-xs font-medium text-slate-500 uppercase">Formato do Arquivo</label>
                <div className="grid grid-cols-2 gap-2">
                  <button className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-700">SPED Fiscal (Simplificado)</button>
                  <button className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-600">CSV Contábil (Excel)</button>
                </div>
              </div>

              <button
                onClick={handleExport}
                disabled={loading}
                className="w-full rounded-xl bg-slate-900 px-6 py-4 text-sm font-semibold text-white shadow-lg transition-transform hover:scale-[1.02] active:scale-100 disabled:opacity-50"
              >
                {loading ? "Gerando arquivo..." : "Gerar Arquivo de Exportação"}
              </button>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="bg-slate-900 text-white border-none shadow-xl">
            <CardContent className="p-6">
              <h3 className="text-sm font-semibold text-blue-400 uppercase tracking-widest mb-2">Dica Fiscal</h3>
              <p className="text-sm text-slate-300">
                A exportação SPED Fiscal (EFD ICMS/IPI) consolida todas as movimentações de entrada e saída, inventário e apuração de impostos do período selecionado.
              </p>
            </CardContent>
          </Card>
          
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <h3 className="font-semibold mb-3">Histórico de Exportações</h3>
            <div className="text-center py-8">
              <span className="text-3xl mb-2 block">📄</span>
              <p className="text-xs text-slate-400">Nenhum histórico disponível para este período.</p>
            </div>
          </div>
        </div>
      </div>
      
      {error && <div className="p-4 bg-red-50 text-red-700 rounded-xl border border-red-100 text-sm">{error}</div>}
    </main>
  );
}
