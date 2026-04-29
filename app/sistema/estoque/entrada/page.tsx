"use client";

import { useEffect, useState } from "react";

type Produto = {
  id: number;
  codigoInterno?: string | null;
  descricao: string;
};

export default function EntradaEstoquePage() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");

  const [form, setForm] = useState({
    produtoId: "",
    codigoLote: "",
    validade: "",
    quantidade: "",
    custoUnitario: "",
    observacao: "",
  });

  async function carregarProdutos() {
    try {
      const res = await fetch("/api/produto");
      const data = await res.json();
      setProdutos(Array.isArray(data) ? data : []);
    } catch {
      setErro("Erro ao carregar produtos.");
    }
  }

  useEffect(() => {
    carregarProdutos();
  }, []);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErro("");

    try {
      const res = await fetch("/api/estoque/lote/entrada", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          produtoId: Number(form.produtoId),
          codigoLote: form.codigoLote,
          validade: form.validade || null,
          quantidade: Number(form.quantidade),
          custoUnitario: form.custoUnitario ? Number(form.custoUnitario) : null,
          observacao: form.observacao,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Erro ao salvar entrada.");
      }

      alert("Entrada de estoque registrada com sucesso.");

      setForm({
        produtoId: "",
        codigoLote: "",
        validade: "",
        quantidade: "",
        custoUnitario: "",
        observacao: "",
      });
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setLoading(false);
    }
  }

  const input = "w-full rounded-xl border border-slate-300 px-3 py-2 text-sm";
  const label = "mb-1 block text-xs font-medium text-slate-500";

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <p className="text-sm text-slate-500">Estoque</p>
          <h1 className="text-3xl font-semibold text-slate-900">
            Entrada de estoque
          </h1>
        </div>

        {erro && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {erro}
          </div>
        )}

        <form
          onSubmit={salvar}
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4"
        >
          <div>
            <label className={label}>Produto</label>
            <select
              className={input}
              value={form.produtoId}
              onChange={(e) => setForm({ ...form, produtoId: e.target.value })}
              required
            >
              <option value="">Selecione...</option>
              {produtos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.codigoInterno ? `${p.codigoInterno} - ` : ""}
                  {p.descricao}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={label}>Código do lote</label>
              <input
                className={input}
                value={form.codigoLote}
                onChange={(e) => setForm({ ...form, codigoLote: e.target.value })}
                required
              />
            </div>

            <div>
              <label className={label}>Validade</label>
              <input
                type="date"
                className={input}
                value={form.validade}
                onChange={(e) => setForm({ ...form, validade: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={label}>Quantidade</label>
              <input
                type="number"
                className={input}
                value={form.quantidade}
                onChange={(e) => setForm({ ...form, quantidade: e.target.value })}
                required
              />
            </div>

            <div>
              <label className={label}>Custo unitário</label>
              <input
                type="number"
                step="0.01"
                className={input}
                value={form.custoUnitario}
                onChange={(e) =>
                  setForm({ ...form, custoUnitario: e.target.value })
                }
              />
            </div>
          </div>

          <div>
            <label className={label}>Observação</label>
            <textarea
              className={input}
              value={form.observacao}
              onChange={(e) => setForm({ ...form, observacao: e.target.value })}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-slate-900 px-4 py-3 text-white text-sm font-medium disabled:opacity-60"
          >
            {loading ? "Salvando..." : "Registrar entrada"}
          </button>
        </form>
      </div>
    </main>
  );
}