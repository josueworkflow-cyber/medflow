"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";

export default function ImportarNFePage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");
  const router = useRouter();

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;

    setLoading(true);
    setError("");
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/compras/importar", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="p-6 space-y-6">
      <div>
        <p className="text-sm text-slate-500">Compras</p>
        <h1 className="text-3xl font-semibold text-slate-900">Importar NF-e (XML)</h1>
        <p className="text-sm text-slate-400 mt-1">Automatize a entrada de produtos e estoque via nota fiscal eletrônica</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="border-dashed border-2 border-slate-300 bg-slate-50/50">
          <CardContent className="p-8">
            <form onSubmit={handleUpload} className="flex flex-col items-center text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-100 text-3xl">
                📄
              </div>
              <h2 className="text-lg font-semibold text-slate-900">Selecione o arquivo XML</h2>
              <p className="text-sm text-slate-500 mb-6 max-w-xs">
                Arraste ou selecione o arquivo da nota fiscal (formato .xml) emitido pelo seu fornecedor
              </p>

              <input
                type="file"
                accept=".xml"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="mb-6 block w-full text-sm text-slate-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-full file:border-0
                  file:text-sm file:font-semibold
                  file:bg-blue-50 file:text-blue-700
                  hover:file:bg-blue-100 cursor-pointer"
              />

              <button
                type="submit"
                disabled={!file || loading}
                className="w-full max-w-xs rounded-xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white shadow-lg transition-transform hover:scale-[1.02] active:scale-100 disabled:opacity-50"
              >
                {loading ? "Processando XML..." : "Iniciar Importação"}
              </button>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-6">
          {error && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-6 flex items-start gap-4">
                <span className="text-xl text-red-600">⚠️</span>
                <div>
                  <h3 className="font-semibold text-red-800">Erro na Importação</h3>
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {result && (
            <Card className="border-emerald-200 bg-emerald-50">
              <CardContent className="p-6">
                <div className="flex items-center gap-4 mb-4">
                  <span className="text-2xl">✅</span>
                  <div>
                    <h3 className="font-semibold text-emerald-800">Importação Concluída!</h3>
                    <p className="text-sm text-emerald-700">A NF-e foi processada com sucesso.</p>
                  </div>
                </div>

                <div className="space-y-2 rounded-xl bg-white/60 p-4 text-sm text-slate-700">
                  <p><strong>Fornecedor:</strong> {result.fornecedor}</p>
                  <p><strong>Valor Total:</strong> R$ {result.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                  <p><strong>Pedido Gerado:</strong> #{result.pedidoId}</p>
                </div>

                <button
                  onClick={() => router.push("/sistema/compras")}
                  className="mt-6 w-full rounded-xl bg-white border border-emerald-200 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors"
                >
                  Ver Pedidos de Compra
                </button>
              </CardContent>
            </Card>
          )}

          {!result && !error && !loading && (
            <div className="rounded-2xl border border-slate-200 p-8 text-center bg-white">
              <p className="text-slate-400 text-sm">
                O resultado da importação aparecerá aqui após o processamento do arquivo.
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
