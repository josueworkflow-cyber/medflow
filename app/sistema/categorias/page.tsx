"use client";

import { useEffect, useState } from "react";

type Categoria = {
  id: number;
  nome: string;
};

export default function CategoriasPage() {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [nome, setNome] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");

  async function carregarCategorias() {
    try {
      setErro("");
      const res = await fetch("/api/produto/categoria");
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Erro ao carregar categorias.");
      }

      setCategorias(Array.isArray(data) ? data : []);
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Erro ao carregar categorias.");
    }
  }

  async function salvarCategoria() {
    if (!nome.trim()) {
      setErro("Digite o nome da categoria.");
      setSucesso("");
      return;
    }

    try {
      setSalvando(true);
      setErro("");
      setSucesso("");

      const res = await fetch("/api/produto/categoria", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ nome }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Erro ao salvar categoria.");
      }

      setNome("");
      setSucesso("Categoria cadastrada com sucesso.");
      carregarCategorias();
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Erro ao salvar categoria.");
      setSucesso("");
    } finally {
      setSalvando(false);
    }
  }

  useEffect(() => {
    carregarCategorias();
  }, []);

  return (
    <main className="space-y-6 p-6">
      <div>
        <p className="text-sm text-slate-500">Cadastro básico</p>
        <h1 className="text-3xl font-semibold text-slate-900">Categorias</h1>
      </div>

      {erro && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {erro}
        </div>
      )}

      {sucesso && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {sucesso}
        </div>
      )}

      <section className="grid gap-6 lg:grid-cols-[420px_1fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">
            Nova categoria
          </h2>

          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">
                Nome da categoria
              </label>
              <input
                type="text"
                placeholder="Ex.: Medicamentos"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-400"
              />
            </div>

            <button
              onClick={salvarCategoria}
              disabled={salvando}
              className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white disabled:opacity-60"
            >
              {salvando ? "Salvando..." : "Cadastrar categoria"}
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">
              Categorias cadastradas
            </h2>
            <span className="text-sm text-slate-500">
              {categorias.length} itens
            </span>
          </div>

          {categorias.length === 0 ? (
            <p className="text-sm text-slate-500">
              Nenhuma categoria cadastrada ainda.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
                    <th className="px-3 py-2">ID</th>
                    <th className="px-3 py-2">Nome</th>
                  </tr>
                </thead>
                <tbody>
                  {categorias.map((categoria) => (
                    <tr
                      key={categoria.id}
                      className="border-b border-slate-100 hover:bg-slate-50"
                    >
                      <td className="px-3 py-2 text-slate-500">{categoria.id}</td>
                      <td className="px-3 py-2">{categoria.nome}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}